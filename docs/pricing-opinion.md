# The $300 minimum — my opinion

**Verdict: change it back — and then some. Kill the floor entirely.**

The test for pricing is simple: if the person who designed it needs a paragraph to
explain why Fancy says $100 today and $200 tomorrow, the client will feel a gotcha
instead of reading a price. You got confused by your own pricing — that is the whole
finding. Everything else is detail.

## Why the minimum model failed

1. **Moving prices read as tricks.** A label that changes $0 → +$100 → +$200 as you
   click is mathematically fair and emotionally expensive. At this price tier, people
   are comparing simple offers. A puzzle loses to a flat menu every time.
2. **Order-dependence.** The same two addons cost different totals depending on which
   you clicked first. Nobody should have to think about that.
3. **"$0" devalues.** A $0 price tag teaches "this is free stuff" — then it changes.
4. **It contradicts your own brand copy.** "No jargon, no pressure" is flat pricing.

## What is live now (the flat menu)

| | |
|---|---|
| **Standard** | **$300** — no minimum trick, it's just the price |
| Logic · Editing · Database · Fancy · Payment | **+$100 each** |
| **Login** | **$0** — the one gift |
| **Payment** pulls Login · Editing · Database | those tiles say **"included"** and cost $0 |
| Revision | $75 a session (2 included, 3 with Fancy) |
| Pages | $50 each over 5 |
| Rush (within 1 week) | +$100 at payment |

Labels never move. Every number on screen is true at every moment. The bundle story
still works — it just works in the generous direction: **Payment $100 — includes
login, editing and database** is a better pitch than Payment $200 plus three
mysterious companions totalling $700.

## Kept from the confusing era (they were good)

- The **cascade** (Payment brings its crew) — shown with the word "included"
- **Revisions and pages as visible line items**
- The **$200 deposit** at checkout (fixed, refundable at the end of the 1st revision)

## If you want the numbers richer later

Change one `STATIC_LABELS` map and one `PRICES` object — e.g. Fancy +$200, Payment
+$200 with its crew. The model stays flat; only the digits move. That is the kind of
pricing change a business should make: on purpose, not as a side effect of clicking.
