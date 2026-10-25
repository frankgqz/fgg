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
base $200 · fancy +$200 · math +$100 · database +$200 · editing +$100 · shop +$200 · login +$100 · pages $50 ea over 5 · care $200/y. Model (2026-10-26 late): EVERY CHECKED ROW = its price (no bundled 'included'); dependencies only auto-check boxes. Only dependency: shop => database (products are persistent listings). Editing standalone. Gated content = login + payment link, NOT shop. Shop demo = carousel. Full shop stack = 200+200(+100 editing).
"tags" not "categories" (Frank: same thing, prefers tag). Shop tier rule: shop INCLUDES CMS (a shop without editing is a museum); exception = fixed 1-product shop (~$500). Admin for shop template: Payload default (professional), Google Sheets opt-in.
Full addon menu = Frank's private quoting tool; this page is the public face.

## Open items
- `mailto:hello@fgg.company` is a placeholder — Frank to set real contact
- OG share image not made yet
- GG Agency case study listed — Frank to confirm
- Login demo — "just change the end price" for now; real demo later
