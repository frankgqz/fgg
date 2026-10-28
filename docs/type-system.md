# Type system — exploration

The question on the table: is 1.125 the right system for this site, and what should
the anchor be? Two proposals are live: **A — five round tokens** (my earlier pitch),
and **B — keep the 1.125 ladder, anchor on the paragraph, unify the strays** (Frank's).

## How rem actually works

- `rem` = **root em**: always measured against the `<html>` element's font-size.
- The browser *default* is 16px — "1rem = 16px" is a factory setting, not a law.
- `html { font-size: 17px }` makes 1rem = 17px everywhere. It really is just a setting.
- `em` measures against the **parent** (font-size property) or **itself** (other
  properties) — it compounds when nested; that's why scales use rem.
- Accessibility: pinning html to px overrides a user's enlarged-text preference;
  leaving html unset (or `font-size: 100%`) lets their default flow through.
  Our html is unset today — good — but body is pinned to 17px, which creates the
  wart below.

## The wart: 17px vs 1rem

`body { font-size: 17px }` while `1rem = 16px` (html unset). Consequences:

- Paragraphs are **17px**, but every rem-based element is measured on a **16px** base.
- The scale is therefore 6% detuned from the text it lives next to.
- "1rem" and "the paragraph" are not the same thing — the anchor question Frank
  asked is exactly the right one.

## The current state (measured)

14 distinct text sizes are live:

| size | where |
|---|---|
| 2.027rem | h1 (page titles) |
| 1.602rem | h3 (sections) |
| 1.266rem | h5 (card titles) |
| 1.125rem | lede, card titles (feature-head b) |
| 17px | body/paragraph |
| 1rem | feature-desc etc (16px!) |
| 1.02rem | feature-head base |
| 0.95rem | price em |
| 0.92rem | tabs, small buttons |
| 0.889rem | small tier (panel, cards) |
| 0.85rem | chips |
| 0.82rem | book pill |
| 0.78rem | card labels (qs-label) |
| 0.72rem | micro tags |

The strays (1.02 and below) are the real problem — not the ratio.

## Option A — five round tokens (32/24/20/16/14)

2rem · 1.5rem · 1.25rem · 1rem · 0.875rem. Paragraph = 1rem = 16px by definition.

- + numbers you can hold in your head
- + classic; used by most design systems
- − every heading moves 2–7%; the typescale row mapping (h1/h3/h5 = 2.027/1.602/1.266)
  is abandoned
- − the scale is *picked*, not generated — each step is a human decision

## Option B — 1.125 ladder, paragraph-anchored (Frank's)

2.027 · 1.602 · 1.266 · 1.125 · **1rem (paragraph)** · 0.889. All strays → 0.889.

- + paragraph IS 1rem — the anchor question resolves cleanly (body → 1rem, html left
  unset so user text-scaling still works)
- + keeps today's typescale work (h1/h3/h5 rows map exactly)
- + the scale is *generated*: every size is 1.125ⁿ — derivable, not remembered
- + almost zero visual churn (17px → 16px body, strays → 0.889; headings untouched)
- − the decimals look fussy in source (mitigated: the `--fs-*` variables name the
  roles, so nobody types them)

## Verdict — B, and I changed my pick

I pitched A for memorability. Sitting with the trade-offs, B is the better call for
this site:

1. The pain was never the ratio — it was the strays and the 17/16 split. B kills both.
2. A generated scale answers "what size is X?" with arithmetic (1.125ⁿ) instead of
   a lookup; a picked scale answers with "because I said so".
3. Near-zero visual churn after a full day of tuning by eye.
4. The `--fs-*` layer already names every role — the decimals are implementation
   detail, not something anyone holds in their head.

A remains one clean swap if the decimals ever annoy.

## If B goes live — what moves

- `body { font-size: 17px }` → `1rem` (17 → 16px; ~6% smaller text — the only visible move)
- strays 1.02 / 0.95 / 0.92 / 0.85 / 0.82 / 0.78 / 0.72 → **0.889rem**
  (micro-tags may keep 0.72 if 0.889 swamps them — one judged exception)
- h1/h3/h5/lede unchanged
- one wrinkle to note: `body` at 1rem and `--fs-small` at 0.889 = the small tier
  becomes 0.111rem under the body — that's the ratio doing its job (1 ÷ 1.125)
