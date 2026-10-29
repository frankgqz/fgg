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
