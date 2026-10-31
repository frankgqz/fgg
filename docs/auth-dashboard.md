# Auth + dashboard — exploration (2026-10-28)

**Verdict: Cloudflare Access (one-time email codes) in front of a /dashboard
page that reads the D1 you already have. No passwords anywhere. Three phases,
phase 1 is a day — build next week as planned.**

## The fork to settle first: whose login?

Two different things share the word "auth":

1. **Your admin dashboard** (this document) — you, maybe Haylee one day.
2. **The Login product line** ($100 panel) — end-users of client sites:
   users table, passwords or magic links, sessions, per-client isolation.
   That's a product build, not an admin tool — do it when someone buys it.

Everything below is #1.

## Auth options for the dashboard

| | Cloudflare Access | Magic link (Resend) | Roll-your-own |
|---|---|---|---|
| passwords | none | none | you own them |
| code to write | ~0 (dashboard config) | ~1 day | 2–3 days |
| expiry/reset/rate limits | Cloudflare's problem | your problem | your problem |
| cost | free up to 50 users | Resend free tier | free |
| tie-in | already on Cloudflare | already Resend | — |

**Pick: Cloudflare Access with email OTP.** The "login page" is
Cloudflare-hosted: type your email, get a one-time code (via your own inbox —
no new vendor), done. The Worker additionally verifies the Access JWT on
`/dashboard*` and `/api/dashboard*` as belt-and-braces. If a day comes when
you want the login to look like your brand, swap to the Resend magic-link
route without touching what's inside the dashboard.

## What the dashboard shows — build order

**Phase 1 — the intake desk (~a day).** Access gate + `/dashboard` listing
D1 submissions: name/business/date, the package, "how did you hear", and the
`/files/…` links. Read-only over data that already exists. Also move
`/files/` behind the gate while we're there (only your emails carry those
links, so nothing breaks).

**Phase 2 — payments (~a day).** Stripe webhook
(`checkout.session.completed`, `invoice.paid`) → a `payments` table
(mode, amount, session, business) → a Payments section. Until it lands,
Stripe's own dashboard + the confirmation emails cover you.

**Phase 3 — the care clock.** A `care` table (client, renewal date,
subscription id) + a "due soon" column + one cron nudge ~30 days out. The
yearly subscriptions are already the data source.

**Phase 4 — the client portal** (the Login product). Separate project.

## Mechanics worth knowing before the build

- Access policies are path-scoped (`frankg.com.au/dashboard*`,
  `/api/dashboard*`) — the public site is untouched. Add `noindex` to the
  dashboard; a login page in Google helps nobody.
- Lockout safety: dash.cloudflare.com stays the back door — a typo'd Access
  policy can gate the dashboard, never the account.
- Phone-first: the dashboard exists for triage from your phone — one column,
  the same dense type system as the site (1.125 ladder).
- Webhooks are the only part with real failure modes (replay, mis-signature):
  verify the signing secret, store the session id, ignore duplicates.

## What this changes elsewhere

Yesterday's Sheets-vs-dashboard call: this becomes the source of truth. An
"export to Sheets/CSV" button can come later for the Money workbook handoff.
Care renewal nudges still fire from cron regardless of where the table lives.

## If built — the shape

Static `/dashboard.html` + read endpoints on the **existing** Worker + D1 +
R2. New tables: `payments`, `care`. No new services, no new bills beyond the
Zero Trust free tier.

Risks: webhook misfiring (mitigated by signature verify + idempotent rows),
Access config lockout (dash back door), scope creep into the client portal
(hold the line — that's a paid product, not admin polish).

---
## Part 2 · 2026-10-28 — the door is not the room

**Verdict unchanged in shape, clarified in words: the dashboard is a page WE
build (our HTML, our Worker, our D1). Cloudflare Access is only the login
screen in front of it — the bouncer, not the venue.**

### Clearing the confusion

"Cloudflare dashboard" was a naming collision — two different things:

- **Cloudflare's own dashboard** (dash.cloudflare.com) = where you manage
  DNS/workers. Nothing to do with your product. It's just the back door if
  a login config ever misfires.
- **Cloudflare Access** = a gatekeeper in front of YOUR urls. Visit
  /dashboard → Cloudflare intercepts before your Worker ever runs → shows a
  login page → checks the code → passes the request through. The room
  inside is entirely ours: a /dashboard.html we write, pulling rows from
  D1 through our own /api/dashboard endpoints. Yes — "just build our own,
  pulls data from database" is exactly the plan.

### What Access actually buys us (the door benefits)

1. **Zero auth code in our app.** No sessions, cookies, tokens, expiry,
   password resets, or brute-force handling in the Worker. That's a whole
   product's worth of subtle bugs not written.
2. **Unauthenticated requests never reach our code** — the gate sits in
   front of the Worker, so an app bug can't leak data to strangers. This is
   the architectural reason, more than convenience.
3. **Nothing to breach.** No password database exists.
4. Free up to 50 users (verified 2026-10-28), path-scoped to /dashboard*.

Costs, honestly: the login page looks Cloudflare-ish (or wears a Google
button), session length is their setting, and it's their config to get right.

### Google auth? Yes — and Access can BE Google auth

"Sign in with Google" is real OAuth and works two ways here:

- **Through Access (recommended):** add Google as the identity provider —
  the login page becomes a "Sign in with Google" button, your Google
  account IS the key. Zero codes, zero auth code in our app, and it
  answers the "isn't there Google auth?" question literally.
- **Hand-rolled Google OAuth in the Worker:** client ID/secret, redirect
  flow, token verification — about a day of careful code, and all the door
  bugs above become ours again.

### The door options (revised)

| door | what logging in looks like | our code | pick |
|---|---|---|---|
| Access + Google button | click "Sign in with Google" | none | **✓** |
| Access + email code | type email, enter code | none | backup |
| Resend magic link | click link in email | ~1 day | if no Cloudflare at all |
| Hand-rolled Google OAuth | click "Sign in with Google" | ~1 day | not worth it |
| Shared password | one password in a cookie | ~an hour | only as a placeholder |

### The dashboard itself — the sections (from your list)

Everything below is OUR page, one column, the site's dense type system.

1. **Activity feed** (newest first) — the "what happened" surface you
   described: new preference submission · payment received · revision
   requested · intake updated. One row each: who, what, when, links.
2. **Payments history** — date · business · mode (deposit / full / yearly /
   custom) · amount · status · Stripe receipt link.
3. **Clients** — one row per business with a phase pill: intake sent →
   deposit paid → building → revision → launched → on care, plus the care
   renewal date when live.
4. **Small stats strip** — submissions this month · collected this month ·
   care renewals due.

Data sources: intakes already write D1 ✓ (feed item free); payments come
from a Stripe webhook (phase 2); revision requests = one small table or a
phase change Frank taps (phase 2.5 — the client-portal form comes later).

### Revised verdict

Same build, same phases. The door = **Access with "Sign in with Google"**
(dashboard-config, not code). The room = ours, fed by D1 + Stripe webhooks.
Nothing about the product itself lives in Cloudflare.

---
## Part 3 · 2026-10-28 — one auth, and the database shape

**Verdict: your call lands well — one auth mechanism (Better Auth) with an
admin flag, no Cloudflare Access. The schema below builds ON the D1 that
already exists (fgg is not starting from zero).**

### First, a correction: fgg already has a database

D1 `fgg-db` is live with four tables:

    wall           the demo message board (name, avatar, body, created_at)
    likes          the demo counter
    submissions    every intake (name, email, business, answers JSON, created_at)
    upload_counts  the daily upload abuse cap

The dashboard's job is to make `submissions` legible and surround it with
the tables below. Uploaded files live in R2 (`fgg-intake`/`intake/*`) with
`/files/…` links in the intake email — there is no gallery yet; the
dashboard's feed + client rows become their home.

### Better Auth's own tables (generated — do not reinvent)

    user       id, name, email, emailVerified, image, **role**, createdAt
    session    token, expiresAt, userId
    account    providerId, accountId (the Google link), userId
    verification  one-time tokens (email verification, etc)

The **admin flag** = `user.role` ('admin' | 'client'). Role checks are our
code: one `requireAdmin()` helper, one scoped-query helper.

### New tables (the dashboard's data)

**clients** — one row per business; the spine everything hangs on

    id            integer pk
    business      text
    contact_name  text
    email         text
    phone         text
    domain        text (nullable — the live site when it exists)
    phase         text: intake -> quoted -> deposit_paid -> building
                  -> revision -> launched -> care        (the pill)
    user_id       text nullable -> Better Auth user (wired at phase 4)
    created_at, launched_at

**payments** — every Stripe event, fed by webhook, idempotent

    id                integer pk
    client_id         fk
    stripe_session_id text unique (the idempotency key)
    subscription_id   text nullable
    mode              text: deposit | full | balance | yearly | custom
    amount_cents      integer (cents — never dollars, never floats)
    status            text: paid | refunded | disputed
    paid_at           datetime

**revisions** — the "revision requests" you named

    id          integer pk
    client_id   fk
    summary     text (what they asked for)
    status      text: open | done
    created_at, closed_at

**events** — the activity feed, append-only

    id          integer pk
    client_id   fk nullable
    type        text: intake_received | payment | revision_requested
                | phase_changed | file_uploaded | note
    payload     json (small: amount, label, file key…)
    created_at

The feed is `SELECT * FROM events ORDER BY created_at DESC` — every other
table's writes also append one line here. That pattern keeps the feed free
forever and makes "when did anything happen?" one query.

**files** (phase 2.5, optional at first)

    id, client_id, key (r2), original_name, kind, uploaded_by, created_at
    Phase 1 derives files from `submissions.answers.files[]` as it does
    today; the table earns its place when the client portal uploads.

### Design rules for the schema

- Money in **cents**, integers only.
- Timestamps in UTC; render in Melbourne.
- Statuses as TEXT (app-enforced vocabulary) — D1 doesn't need enums.
- Append-only `events`; mutable state lives in `clients`/`payments`/`revisions`.
- A new intake **auto-creates a client row** (phase 'intake') + an event —
  the intake desk is then free. If a lead dies, the row just sits there.

### Revised build order (auth moved to the front)

1. **Better Auth** (its 4 tables + login page + role) + `clients` +
   `events` + the dashboard reading `submissions` → ~2 sessions
2. **Stripe webhook** → `payments` + `care` columns (+ renewal dates)
3. **revisions** + the care clock (cron nudge 30 days out)
4. **Client portal** pages (user_id wiring, scoped queries)

Risks kept from Part 1: webhook misfires (idempotency keys), scope leaks
(the two helpers are the whole defense), and scope creep into phase 4.
