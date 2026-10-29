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
