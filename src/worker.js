// FGG worker: static assets first, plus a tiny D1-backed wall API.
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const AVATARS = ["🙂", "🌟", "💃", "🚀", "🎨", "🦊"];

let dbReady = null;
function ensureDb(env) {
  if (!dbReady) {
    dbReady = (async () => {
      await env.DB.exec("CREATE TABLE IF NOT EXISTS wall (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, avatar TEXT NOT NULL DEFAULT '🙂', body TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))");
      await env.DB.exec("CREATE TABLE IF NOT EXISTS likes (id INTEGER PRIMARY KEY CHECK (id = 1), n INTEGER NOT NULL DEFAULT 0)");
      await env.DB.exec("CREATE TABLE IF NOT EXISTS submissions (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL, business TEXT NOT NULL, answers TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))");
      await env.DB.exec("INSERT OR IGNORE INTO likes (id, n) VALUES (1, 0)");
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
      if (url.pathname === "/intake" || url.pathname === "/intake/") {
        return env.ASSETS.fetch(new Request(new URL("/intake.html", url.origin), req));
      }
      if (url.pathname === "/api/checkout" && req.method === "GET") {
        const PRICES = { fancy: 200, math: 100, db: 100, cms: 100, shop: 100, login: 100 };
        const ids = String(url.searchParams.get("ids") || "").split(",").map((x) => x.trim()).filter(Boolean);
        const rev = Math.max(0, parseInt(url.searchParams.get("rev") || "2", 10) || 0);
        const pages = Math.max(1, parseInt(url.searchParams.get("pages") || "1", 10) || 1);
        let total = 200;
        for (const id of ids) if (PRICES[id]) total += PRICES[id];
        total += Math.max(0, rev - (ids.includes("fancy") ? 3 : 2)) * 75;
        total += Math.max(0, pages - 5) * 50;
        const origin = url.origin;
        if (!env.STRIPE_SECRET_KEY) return Response.redirect(origin + "/pay?pay=unavailable", 302);
        const body = new URLSearchParams({
          mode: "payment",
          "line_items[0][quantity]": "1",
          "line_items[0][price_data][currency]": "aud",
          "line_items[0][price_data][unit_amount]": String(total * 100),
          "line_items[0][price_data][product_data][name]": "FGG \u2014 website build",
          success_url: origin + "/pay?paid=1",
          cancel_url: origin + "/pay?pay=cancelled",
        });
        const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            authorization: "Bearer " + env.STRIPE_SECRET_KEY,
            "content-type": "application/x-www-form-urlencoded",
          },
          body,
        });
        const sess = await r.json().catch(() => null);
        if (!sess || !sess.url) return Response.redirect(origin + "/pay?pay=unavailable", 302);
        return Response.redirect(sess.url, 302);
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
        if (!name || !email || !business) return json({ error: "name, business and email required" }, 400);
        const qa = Array.isArray(d.qa) ? d.qa : [];
        const record = { qa, quote: String(d.quote || "") };
        const answers = JSON.stringify(record);
        await env.DB.prepare("INSERT INTO submissions (name, email, business, answers) VALUES (?, ?, ?, ?)")
          .bind(name, email, business, answers).run();
        const lines = qa
          .map((row) => Array.isArray(row) ? String(row[0] || "") + ": " + (row[1] ? String(row[1]) : '""') : "")
          .join("\n");
        let emailed = false, confirmed = false;
        if (env.RESEND_API_KEY) {
          try {
            const body = name + " (" + email + ") \u2014 " + business + "\n\n" + (lines || "(no answers)");
            const r = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "content-type": "application/json", authorization: "Bearer " + env.RESEND_API_KEY },
              body: JSON.stringify({
                from: "FGG Intake <intake@frankg.com.au>",
                to: ["frank@frankg.com.au"],
                reply_to: email,
                subject: "New intake \u2014 " + business,
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
                text: "Hi " + name + ",\n\nThank you for submitting the form \u2014 I have your answers and I will read them properly.\n\nI will reply to " + email + " within a day.\n\n\u2014 Frank\nFGG \u00b7 frankg.com.au",
              }),
            });
            confirmed = r2.ok;
          } catch {}
        }
        return json({ ok: true, emailed, confirmed });
      }
      return env.ASSETS.fetch(req);
    } catch (err) {
      return json({ error: String(err) }, 500);
    }
  },
};
