import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins/magic-link";

// FGG worker: static assets first, plus a tiny D1-backed wall API.
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

function noStore(resp) {
  const h = new Headers(resp.headers);
  h.set("cache-control", "no-store");
  return new Response(resp.body, { status: resp.status, headers: h });
}

const AVATARS = ["🙂", "🌟", "💃", "🚀", "🎨", "🦊"];

let dbReady = null;
async function dashToken(key) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey("raw", enc.encode(String(key)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode("fgauth-v1"));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function safeEq(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(String(a))),
    crypto.subtle.digest("SHA-256", enc.encode(String(b))),
  ]);
  const va = new Uint8Array(ha), vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}

async function dashOk(req, env) {
  if (!env.AUTH_KEY) return false;
  const m = (req.headers.get("cookie") || "").match(/fgauth=([a-f0-9]{64})/);
  if (!m) return false;
  return safeEq(m[1], await dashToken(env.AUTH_KEY));
}

let authInst = null;
function getAuth(env) {
  if (!authInst) {
    authInst = betterAuth({
      database: env.DB,
      secret: env.BETTER_AUTH_SECRET,
      baseURL: "https://frankg.com.au",
      trustedOrigins: ["https://frankg.com.au", "https://www.frankg.com.au", "https://fgg.frankgqz.workers.dev"],
      socialProviders: {
        google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, prompt: "select_account" },
      },
      emailAndPassword: { enabled: true },
      plugins: [
        magicLink({
          expiresIn: 60 * 15,
          disableSignUp: true,
          sendMagicLink: async ({ email, url }) => {
            const known = await env.DB.prepare("SELECT id FROM user WHERE lower(email) = lower(?)").bind(String(email)).first();
            if (!known) return;
            const html = '<p>Hi \u2014 here is your sign-in link for the FGG dashboard.</p>' +
              '<p><a href="' + url + '">Sign in to your dashboard</a></p>' +
              '<p>The link works once and expires in 15 minutes. If you did not ask for it, you can ignore this email.</p>';
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "content-type": "application/json", authorization: "Bearer " + env.RESEND_API_KEY },
              body: JSON.stringify({
                from: "Frank Gao <frank@frankg.com.au>",
                to: [email],
                subject: "Your FGG dashboard link",
                text: "Sign in to your FGG dashboard (works once, expires in 15 minutes): " + url,
                html,
              }),
            });
          },
        }),
      ],
      user: {
        additionalFields: {
          role: { type: "string", defaultValue: "client", input: false },
        },
      },
    });
  }
  return authInst;
}

function adminSeed(env) {
  return String(env.ADMIN_EMAILS || "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
}

async function adminOk(req, env) {
  if (env.BETTER_AUTH_SECRET && env.GOOGLE_CLIENT_ID) {
    const s = await getAuth(env).api.getSession({ headers: req.headers }).catch(() => null);
    if (s && s.user) {
      if (s.user.role === "admin") return s.user;
      const email = String(s.user.email || "").toLowerCase();
      const promote = async () => {
        await env.DB.prepare("UPDATE user SET role = 'admin' WHERE lower(email) = lower(?)").bind(email).run().catch(() => {});
        return s.user;
      };
      if (adminSeed(env).includes(email)) return promote();
      const anyAdmin = await env.DB.prepare("SELECT count(*) AS n FROM user WHERE role = 'admin'").first().catch(() => null);
      if (!anyAdmin || Number(anyAdmin.n) === 0) {
        const oldest = await env.DB.prepare("SELECT email FROM user ORDER BY createdAt ASC, id ASC LIMIT 1").first().catch(() => null);
        if (oldest && String(oldest.email).toLowerCase() === email) return promote();
      }
      return null;
    }
  }
  if (await dashOk(req, env)) return { email: "key", name: "backup key" };
  return null;
}

function ensureDb(env) {
  if (!dbReady) {
    dbReady = (async () => {
      await env.DB.exec("CREATE TABLE IF NOT EXISTS wall (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, avatar TEXT NOT NULL DEFAULT '🙂', body TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))");
      await env.DB.exec("CREATE TABLE IF NOT EXISTS likes (id INTEGER PRIMARY KEY CHECK (id = 1), n INTEGER NOT NULL DEFAULT 0)");
      await env.DB.exec("CREATE TABLE IF NOT EXISTS submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, business TEXT NOT NULL, answers TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))");
      await env.DB.exec("INSERT OR IGNORE INTO likes (id, n) VALUES (1, 0)");
      await env.DB.exec("CREATE TABLE IF NOT EXISTS upload_counts (day TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0)");
      await env.DB.exec("CREATE TABLE IF NOT EXISTS payments (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL DEFAULT '', name TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL, mode TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', session_id TEXT NOT NULL DEFAULT '', created_at TEXT DEFAULT (datetime('now')), paid_at TEXT)");
      await env.DB.exec("CREATE TABLE IF NOT EXISTS sites (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, domain TEXT NOT NULL UNIQUE, build_amount INTEGER NOT NULL DEFAULT 200, build_paid_at TEXT, care_amount INTEGER NOT NULL DEFAULT 200, care_from TEXT, created_at TEXT DEFAULT (datetime('now')))");
      await env.DB.prepare("INSERT OR IGNORE INTO sites (email, domain, build_amount, build_paid_at, care_amount, care_from) VALUES (?, ?, 200, '2026-08-30', 200, '2026-08-30')").bind("haylee.trinh@gmail.com", "ggagency.com.au").run().catch(() => {});
      await env.DB.prepare("INSERT OR IGNORE INTO sites (email, domain, build_amount, build_paid_at, care_amount, care_from) VALUES (?, ?, 200, '2026-10-27', 200, '2026-10-27')").bind("haylee.trinh@gmail.com", "lumidance.com.au").run().catch(() => {});
      await env.DB.exec("create table if not exists \"user\" (\"id\" text not null primary key, \"name\" text not null, \"email\" text not null unique, \"emailVerified\" integer not null, \"image\" text, \"createdAt\" date not null, \"updatedAt\" date not null, \"role\" text not null default 'client')");
      await env.DB.exec("create table if not exists \"session\" (\"id\" text not null primary key, \"expiresAt\" date not null, \"token\" text not null unique, \"createdAt\" date not null, \"updatedAt\" date not null, \"ipAddress\" text, \"userAgent\" text, \"userId\" text not null references \"user\" (\"id\") on delete cascade)");
      await env.DB.exec("create table if not exists \"account\" (\"id\" text not null primary key, \"accountId\" text not null, \"providerId\" text not null, \"userId\" text not null references \"user\" (\"id\") on delete cascade, \"accessToken\" text, \"refreshToken\" text, \"idToken\" text, \"accessTokenExpiresAt\" date, \"refreshTokenExpiresAt\" date, \"scope\" text, \"password\" text, \"createdAt\" date not null, \"updatedAt\" date not null)");
      await env.DB.exec("create table if not exists \"verification\" (\"id\" text not null primary key, \"identifier\" text not null, \"value\" text not null, \"expiresAt\" date not null, \"createdAt\" date not null, \"updatedAt\" date not null)");
      try { await env.DB.exec("alter table \"user\" add column \"role\" text not null default 'client'"); } catch {}
      await env.DB.exec("create index if not exists \"session_userId_idx\" on \"session\" (\"userId\")");
      await env.DB.exec("create index if not exists \"account_userId_idx\" on \"account\" (\"userId\")");
      await env.DB.exec("create index if not exists \"verification_identifier_idx\" on \"verification\" (\"identifier\")");
    })();
  }
  return dbReady;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname === "/api/wall" && req.method === "GET") {
        await ensureDb(env);
        const likes = (await env.DB.prepare("SELECT n FROM likes WHERE id = 1").first())?.n ?? 0;
        const { results } = await env.DB.prepare(
          "SELECT id, name, avatar, body, created_at FROM wall ORDER BY id DESC LIMIT 50"
        ).all();
        return json({ likes, comments: results });
      }
      if (url.pathname === "/api/wall" && req.method === "POST") {
        await ensureDb(env);
        const { name = "", body = "", avatar = "🙂" } = await req.json().catch(() => ({}));
        const n = String(name).trim().slice(0, 24);
        const b = String(body).trim().slice(0, 280);
        if (!n || !b) return json({ error: "name and body required" }, 400);
        await env.DB.prepare("INSERT INTO wall (name, avatar, body) VALUES (?, ?, ?)")
          .bind(n, AVATARS.includes(avatar) ? avatar : "🙂", b)
          .run();
        return json({ ok: true }, 201);
      }
      if (url.pathname === "/api/delete" && req.method === "POST") {
        await ensureDb(env);
        const { id } = await req.json().catch(() => ({}));
        const n = Number(id);
        if (!Number.isInteger(n)) return json({ error: "id required" }, 400);
        await env.DB.prepare("DELETE FROM wall WHERE id = ?").bind(n).run();
        return json({ ok: true });
      }
      if (url.pathname === "/api/like" && req.method === "POST") {
        await ensureDb(env);
        await env.DB.prepare("UPDATE likes SET n = n + 1 WHERE id = 1").run();
        const likes = (await env.DB.prepare("SELECT n FROM likes WHERE id = 1").first())?.n ?? 0;
        return json({ likes });
      }
      if (url.pathname === "/preferences" || url.pathname === "/preferences/") {
        return noStore(await env.ASSETS.fetch(new Request(new URL("/preferences.html", url.origin), req)));
      }
      if (url.pathname === "/intake" || url.pathname === "/intake/") {
        return Response.redirect(url.origin + "/preferences" + url.search, 301);
      }
      if (url.pathname === "/pay" || url.pathname === "/pay/") {
        return Response.redirect(url.origin + "/payment" + url.search, 301);
      }
      if (url.pathname === "/intake.html") {
        return Response.redirect(url.origin + "/preferences" + url.search, 301);
      }
      if (url.pathname === "/favicon.ico") {
        return Response.redirect(url.origin + "/favicon.png", 301);
      }
      if (url.pathname === "/sitemap.xml") {
        const pages = ["/", "/preferences", "/payment", "/legal"];
        const xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
          + pages.map((p) => "  <url><loc>" + url.origin + p + "</loc></url>").join("\n")
          + "\n</urlset>\n";
        return new Response(xml, { headers: { "content-type": "application/xml", "cache-control": "public, max-age=3600" } });
      }
      if (url.pathname === "/payment" || url.pathname === "/payment/") {
        return noStore(await env.ASSETS.fetch(new Request(new URL("/payment.html", url.origin), req)));
      }
      if (url.pathname === "/api/checkout" && req.method === "GET") {
        // three modes: deposit (fixed $200) - full (server-computed) - custom (clamped)
        const mode = String(url.searchParams.get("mode") || "deposit");
        const email = String(url.searchParams.get("email") || "").slice(0, 160);
        const name = String(url.searchParams.get("name") || "").slice(0, 120);
        const note = String(url.searchParams.get("note") || "").slice(0, 120);
        const PRICES = { fancy: 200, math: 100, db: 100, cms: 100, shop: 100, login: 100 };
        const ids = String(url.searchParams.get("ids") || "").split(",").map((x) => x.trim()).filter(Boolean);
        const rev = Math.max(0, parseInt(url.searchParams.get("rev") || "2", 10) || 0);
        const pages = Math.max(1, parseInt(url.searchParams.get("pages") || "1", 10) || 1);
        let full = 200;
        for (const id of ids) if (PRICES[id]) full += PRICES[id];
        full += Math.max(0, rev - (ids.includes("fancy") ? 3 : 2)) * 75;
        full += Math.max(0, pages - 5) * 50;
        if (url.searchParams.get("rush") === "1") full += 100;
        let amount, what;
        if (mode === "care") { amount = 200; what = "care \u2014 billed yearly"; }
        else if (mode === "full") { amount = full; what = "website build \u2014 paid in full"; }
        else if (mode === "custom") {
          const n = Math.round(Number(url.searchParams.get("amount") || "0"));
          if (!(n >= 1 && n <= 20000)) return Response.redirect(url.origin + "/payment?pay=cancelled", 302);
          amount = n; what = "website build \u2014 custom amount";
        } else { amount = 200; what = "website build deposit (balance billed later)"; }
        await ensureDb(env);
        let payId = 0;
        try {
          const ins = await env.DB.prepare("INSERT INTO payments (email, name, note, amount, mode, status) VALUES (?, ?, ?, ?, ?, 'pending')").bind(email, name, note, amount, mode).run();
          payId = ins && ins.meta && ins.meta.last_row_id;
        } catch {}
        const origin = url.origin;
        if (!env.STRIPE_SECRET_KEY) return Response.redirect(origin + "/payment?pay=unavailable", 302);
        const body = new URLSearchParams({
          mode: mode === "care" ? "subscription" : "payment",
          "line_items[0][quantity]": "1",
          "line_items[0][price_data][currency]": "aud",
          "line_items[0][price_data][unit_amount]": String(amount * 100),
          "line_items[0][price_data][product_data][name]": "FGG \u2014 " + what + (note ? " (" + note + ")" : ""),
          success_url: origin + "/paid?session={CHECKOUT_SESSION_ID}",
          cancel_url: origin + "/payment?pay=cancelled",
        });
        if (mode === "care") body.set("line_items[0][price_data][recurring][interval]", "year");
        if (email) body.set("customer_email", email);
        const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            authorization: "Bearer " + env.STRIPE_SECRET_KEY,
            "content-type": "application/x-www-form-urlencoded",
          },
          body,
        });
        const sess = await r.json().catch(() => null);
        if (sess && sess.id && payId) {
          await env.DB.prepare("UPDATE payments SET session_id = ? WHERE id = ?").bind(String(sess.id), payId).run().catch(() => {});
        }
        if (!sess || !sess.url) return Response.redirect(origin + "/payment?pay=unavailable", 302);
        return Response.redirect(sess.url, 302);
      }
      if (url.pathname === "/dashboard" || url.pathname === "/dashboard/") {
        return noStore(await env.ASSETS.fetch(new Request(new URL("/dashboard.html", url.origin), req)));
      }
      if (url.pathname.startsWith("/api/auth/")) {
        await ensureDb(env);
        return getAuth(env).handler(req);
      }
      if (url.pathname === "/api/dash-logout" && req.method === "POST") {
        const h = new Headers({ "content-type": "application/json" });
        h.append("set-cookie", "fgauth=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0");
        h.append("set-cookie", "__Secure-better-auth.session_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0");
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: h });
      }
      if (url.pathname === "/api/dash-login" && req.method === "POST") {
        if (!env.AUTH_KEY) return json({ error: "dashboard not configured" }, 503);
        const d = await req.json().catch(() => ({}));
        if (!(await safeEq(String(d.key || ""), env.AUTH_KEY))) return json({ error: "nope" }, 401);
        const token = await dashToken(env.AUTH_KEY);
        return new Response(JSON.stringify({ ok: true }), { status: 200, headers: {
          "content-type": "application/json",
          "set-cookie": "fgauth=" + token + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000",
        } });
      }
      if (url.pathname === "/paid") {
        const sid = String(url.searchParams.get("session") || "");
        if (sid && env.STRIPE_SECRET_KEY) {
          const r = await fetch("https://api.stripe.com/v1/checkout/sessions/" + encodeURIComponent(sid), {
            headers: { authorization: "Bearer " + env.STRIPE_SECRET_KEY },
          });
          const sess = await r.json().catch(() => null);
          if (sess && sess.payment_status === "paid") {
            await ensureDb(env);
            await env.DB.prepare("UPDATE payments SET status = 'paid', paid_at = datetime('now') WHERE session_id = ?").bind(sid).run().catch(() => {});
            return Response.redirect(url.origin + "/payment?paid=1", 302);
          }
        }
        return Response.redirect(url.origin + "/payment?pay=cancelled", 302);
      }
      if (url.pathname === "/api/sites" && req.method === "GET") {
        await ensureDb(env);
        const who = await adminOk(req, env);
        if (!who) return json({ error: "unauthorized" }, 401);
        const rows = await env.DB.prepare("SELECT id, email, domain, build_amount, build_paid_at, care_amount, care_from FROM sites ORDER BY lower(email), domain").all();
        return json({ ok: true, sites: (rows && rows.results) || [] });
      }
      if (url.pathname === "/api/sites" && req.method === "POST") {
        await ensureDb(env);
        const who = await adminOk(req, env);
        if (!who) return json({ error: "unauthorized" }, 401);
        const b = await req.json().catch(() => ({}));
        const email = String(b.email || "").trim().toLowerCase().slice(0, 160);
        const domain = String(b.domain || "").trim().toLowerCase().slice(0, 160);
        const buildAmount = Math.max(0, Math.round(Number(b.build_amount || 200)));
        const buildPaidAt = String(b.build_paid_at || "").slice(0, 10);
        const careAmount = Math.max(0, Math.round(Number(b.care_amount || 200)));
        const careFrom = String(b.care_from || "").slice(0, 10);
        if (!email.includes("@") || !domain) return json({ error: "email and domain required" }, 400);
        await env.DB.prepare("INSERT OR IGNORE INTO sites (email, domain, build_amount, build_paid_at, care_amount, care_from) VALUES (?, ?, ?, ?, ?, ?)").bind(email, domain, buildAmount, buildPaidAt, careAmount, careFrom).run();
        return json({ ok: true });
      }
      if (url.pathname === "/api/my-sites" && req.method === "GET") {
        await ensureDb(env);
        let email = null;
        if (env.BETTER_AUTH_SECRET && env.GOOGLE_CLIENT_ID) {
          const sess = await getAuth(env).api.getSession({ headers: req.headers }).catch(() => null);
          if (sess && sess.user) email = String(sess.user.email || "").toLowerCase();
        }
        if (!email) return json({ error: "unauthorized" }, 401);
        const rows = await env.DB.prepare("SELECT id, domain, build_amount, build_paid_at, care_amount, care_from FROM sites WHERE lower(email) = ? ORDER BY domain").bind(email).all();
        return json({ ok: true, sites: (rows && rows.results) || [] });
      }
      if (url.pathname === "/api/payments" && req.method === "GET") {
        await ensureDb(env);
        const who = await adminOk(req, env);
        if (!who) return json({ error: "unauthorized" }, 401);
        const rows = await env.DB.prepare("SELECT id, email, name, note, amount, mode, status, created_at, paid_at FROM payments ORDER BY id DESC LIMIT 200").all();
        return json({ ok: true, payments: (rows && rows.results) || [] });
      }
      if (url.pathname === "/api/me" && req.method === "GET") {
        if (env.BETTER_AUTH_SECRET && env.GOOGLE_CLIENT_ID) {
          const s = await getAuth(env).api.getSession({ headers: req.headers }).catch(() => null);
          if (s && s.user) return json({ ok: true, user: { email: s.user.email || "", name: s.user.name || "", image: s.user.image || "", role: s.user.role || "client" } });
        }
        return json({ ok: true, user: null });
      }
      if (url.pathname === "/api/dashboard" && req.method === "GET") {
        await ensureDb(env);
        const who = await adminOk(req, env);
        if (!who) return json({ error: "unauthorized" }, 401);
        await ensureDb(env);
        const rows = await env.DB.prepare("SELECT id, name, email, business, answers, created_at FROM submissions ORDER BY created_at DESC, id DESC LIMIT 200").all();
        const clients = (rows.results || []).map((r) => {
          let a = {};
          try { a = JSON.parse(r.answers || "{}"); } catch {}
          const qa = Array.isArray(a.qa) ? a.qa : [];
          const find = (frag) => {
            const row = qa.find((x) => Array.isArray(x) && String(x[0] || "").toLowerCase().includes(frag));
            return row ? String(row[1] || "") : "";
          };
          return {
            id: r.id, name: r.name, email: r.email, business: r.business,
            phone: find("phone"), heard: find("hear"), created: r.created_at,
            phase: "intake", qa, quote: String(a.quote || ""),
            files: Array.isArray(a.files) ? a.files : [], payCount: 0,
          };
        });
        return json({ ok: true, clients, intakes: clients.length, now: new Date().toISOString().slice(0, 10), user: { email: who.email, name: who.name } });
      }
      if (url.pathname.startsWith("/files/") && req.method === "GET") {
        if (!env.FILES) return json({ error: "storage not ready" }, 503);
        const key = decodeURIComponent(url.pathname.slice("/files/".length));
        if (!key.startsWith("intake/")) return json({ error: "not found" }, 404);
        const obj = await env.FILES.get(key);
        if (!obj) return json({ error: "not found" }, 404);
        return new Response(obj.body, { headers: {
          "content-type": (obj.httpMetadata && obj.httpMetadata.contentType) || "image/jpeg",
          "cache-control": "private, max-age=3600",
        } });
      }
      if (url.pathname === "/api/upload" && req.method === "POST") {
        if (!env.FILES) return json({ error: "storage not ready" }, 503);
        const d = await req.json().catch(() => ({}));
        const b64 = String(d.data || "");
        const rawExt = String(d.ext || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5);
        const ext = rawExt === "jpeg" ? "jpg" : rawExt;
        const TYPES = {
          jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
          pdf: "application/pdf", txt: "text/plain",
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        };
        if (!TYPES[ext]) return json({ error: "images or pdf/txt/docx/xlsx only" }, 415);
        const size = Math.floor(b64.length * 3 / 4);
        if (!size || size > 5 * 1024 * 1024) return json({ error: "max 5MB per image" }, 413);
        await ensureDb(env);
        const day = new Date().toISOString().slice(0, 10);
        const row = await env.DB.prepare("SELECT n FROM upload_counts WHERE day = ?").bind(day).first();
        if ((row && row.n ? row.n : 0) >= 100) return json({ error: "upload limit reached today" }, 429);
        await env.DB.prepare("INSERT INTO upload_counts (day, n) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET n = n + 1").bind(day).run();
        const key = "intake/" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
        await env.FILES.put(key, Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)), { httpMetadata: { contentType: TYPES[ext] } });
        return json({ ok: true, key });
      }
      if (url.pathname === "/api/intake" && req.method === "POST") {
        await ensureDb(env);
        const d = await req.json().catch(() => ({}));
        const website = String(d.website || "");
        const elapsed = Number(d.elapsed) || 0;
        if (website || (elapsed && elapsed < 2500)) return json({ ok: true }); // honeypot + time trap
        const name = String(d.name || "").trim().slice(0, 120);
        const email = String(d.email || "").trim().slice(0, 200);
        const business = String(d.business || "").trim().slice(0, 200);
        if (!email) return json({ error: "email required" }, 400);
        const qa = Array.isArray(d.qa) ? d.qa : [];
        const files = Array.isArray(d.files) ? d.files.slice(0, 6).map((k) => String(k).slice(0, 120)) : [];
        const record = { qa, quote: String(d.quote || ""), files };
        const answers = JSON.stringify(record);
        await env.DB.prepare("INSERT INTO submissions (name, email, business, answers) VALUES (?, ?, ?, ?)")
          .bind(name, email, business, answers).run();
        const lines = qa
          .map((row) => Array.isArray(row) ? String(row[0] || "") + ": " + (row[1] ? String(row[1]) : '""') : "")
          .join("\n");
        let emailed = false, confirmed = false;
        if (env.RESEND_API_KEY) {
          try {
            const body = (name || "there") + " (" + email + ") \u2014 " + (business || "no business name") + "\n\n" + (lines || "(no answers)") + (files.length ? "\n\nFiles:\n" + files.map((k) => "https://frankg.com.au/files/" + k).join("\n") : "");
            const r = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "content-type": "application/json", authorization: "Bearer " + env.RESEND_API_KEY },
              body: JSON.stringify({
                from: "FGG Intake <intake@frankg.com.au>",
                to: ["frank@frankg.com.au"],
                reply_to: email,
                subject: "New intake \u2014 " + (business || email),
                text: body,
              }),
            });
            emailed = r.ok;
          } catch {}
          try {
            const r2 = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "content-type": "application/json", authorization: "Bearer " + env.RESEND_API_KEY },
              body: JSON.stringify({
                from: "FGG Intake <intake@frankg.com.au>",
                to: [email],
                reply_to: "frank@frankg.com.au",
                subject: "Thank you for submitting \u2014 FGG",
                text: "Hi " + (name || "there") + ",\n\nThank you for submitting the form \u2014 I have your answers and I will read them properly.\n\nI will reply to " + email + " within a day.\n\nKnow someone who needs a website? Send them my way \u2014 $100 off your next care year for every referral.\n\n\u2014 Frank\nFGG \u00b7 frankg.com.au",
              }),
            });
            confirmed = r2.ok;
          } catch {}
        }
        return json({ ok: true, emailed, confirmed });
      }
      const resp = env.ASSETS ? await env.ASSETS.fetch(req) : new Response("Not found", { status: 404 });
      if ((resp.headers.get("content-type") || "").includes("text/html")) return noStore(resp);
      return resp;
    } catch (err) {
      return json({ error: String(err) }, 500);
    }
  },
};
