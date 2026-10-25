# fgg — Frank's services one-pager

Static Worker (no npm, no build): `public/` is served as-is via `[assets]`.

## Deploy
Frank's shell: `cd C:\Code\works\fgg` → `npx wrangler deploy`
→ live at `https://fgg.frankgqz.workers.dev`
→ when `fgg.company` is bought: Workers & Pages → fgg → **Custom domains** → add `fgg.company` + `www.fgg.company` (same flow as ggagency 2026-10-25; routes fall through to origin when unmatched — use Custom Domains).

## Structure
- `public/index.html` — the whole site (hero, services, work, contact)
- `public/styles.css` — semantic tokens, `prefers-color-scheme` dark, reduced-motion
- `public/favicon.svg` — F monogram

## Open items
- `mailto:hello@fgg.company` is a placeholder — Frank to set real contact
- Prices ($200 build / $200-y care) published per Frank's quote — strip if he changes strategy
- OG share image not made yet (og:title/description only)
- Case study: GG Agency cited (public site) — Frank to confirm he wants it listed
