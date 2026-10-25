# fgg — Frank's services one-pager

Static Worker (no npm, no build): `public/` is served as-is via `[assets]`.

## Deploy
Frank's shell: `cd C:\Code\works\fgg` → `npx wrangler deploy`
→ live at `https://fgg.frankgqz.workers.dev`
→ when `fgg.company` is bought: Workers & Pages → fgg → **Custom domains** → add `fgg.company` + `www.fgg.company` (same flow as ggagency 2026-10-25; use Custom Domains, not routes).

## Design: SHOW, DON'T DESCRIBE (Frank 2026-10-25)
The page demos every pricing row by BEING it. Quote builder = live demos:
- fancy design → flips `body.fancy` (aurora blobs, glass, chrome text)
- math logic → the quote builder itself + "What size AC?" calculator
- data → tabs (timetable / listings / match history)
- editing (CMS) → `contenteditable` card ("click the text")
- shop → tag-chip filter grid (client-side filtering; chips generate from data)
- login → price-only for now (no demo yet)
- pages → stepper, $40 each over 5
Shop auto-selects CMS (shop includes editing). Total in header pill + big total.

## Pricing decisions (2026-10-25)
base $200 · fancy +$200 · logic +$100 · database +$100 · editing +$100 · shop +$200 · login +$100 · copywriting (by quote) · pages $50 ea over 5 · care $200/y.
Dependencies: shop => database REQUIRED, login => database REQUIRED; shop RECOMMENDS editing + login (red 'required' / accent 'recommended' tags).
Bento layout (compact tiles 1x1/2x1/2x2): fancy 1x1 = WebGL fluid-glass lens (hover-only, chromatic aberration — amanda.fassberg.se style) + liquid button; editing 1x1 = event (name/date/price, EDITS STICK); login/copywriting 1x1 plain; database 2x2 = THE WALL inside it (likes + comments + avatars, live D1); logic 2x1 mini-bento; shop 2x1 = 3 shop-KINDS (physical/services/courses); pages stepper lives in the total-row.

## The wall (live database demo — /api/wall, /api/like)
Worker: `src/worker.js` (assets first, tiny D1 API). Tables auto-create on first hit (wall, likes).
SETUP (Frank's shell, once): run `setup-d1.ps1` (creates fgg-db, wires the id into
wrangler.toml, deploys). Manual path: `npx wrangler d1 create fgg-db` -> paste the
database_id into wrangler.toml -> `npx wrangler deploy`.
KNOWN ERROR: deploying before the D1 exists = 10021 "binding DB ... must have a valid
database_id" (the PASTE-ID placeholder is still in wrangler.toml). Fix = run setup-d1.ps1.
Deploy 2026-10-25 night failed exactly this way; assets uploaded, old version still serving.
Open/public write (validation + 280-char cap only) — no auth by design (it IS the demo). Model (2026-10-26 late): EVERY CHECKED ROW = its price (no bundled 'included'); dependencies only auto-check boxes. Only dependency: shop => database (products are persistent listings). Editing standalone. Gated content = login + payment link, NOT shop. Shop demo = carousel. Full shop stack = 200+200(+100 editing).
"tags" not "categories" (Frank: same thing, prefers tag). Shop tier rule: shop INCLUDES CMS (a shop without editing is a museum); exception = fixed 1-product shop (~$500). Admin for shop template: Payload default (professional), Google Sheets opt-in.
Full addon menu = Frank's private quoting tool; this page is the public face.

## Open items
- `mailto:hello@fgg.company` is a placeholder — Frank to set real contact
- OG share image not made yet
- GG Agency case study listed — Frank to confirm
- Login demo — "just change the end price" for now; real demo later
