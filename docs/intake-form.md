# Client intake form — exploration (2026-10-26)

## Verdict up front

The draft is a **designer's questionnaire, not a client's form**. Its instincts are right — the
permission-granting intro, the screenshot-and-circle instruction, the "what must stay" edits
section are all gold. But at ~25 open questions, the only people who finish it are the clients
you least need it from.

Shape it as **two layers**: ~7 tappable questions anyone can finish on a phone in 3 minutes,
with the rest folded into an optional "go deeper". And **split the Edits half out** — it belongs
to a different moment (the revision round), not the intake.

---

## What's strong — keep verbatim

- **The intro**: "Know what you want? Tell me as much detail as you like… Not sure yet? Just
  answer what feels right." — disarms the blank page. This line does more work than any
  question below it.
- **"Screenshot and circle what you like, cross out what you don't"** — the highest-signal
  instruction in the document. People can't articulate taste; they can point at it.
- **"What should it NOT feel like?"** — negatives are easier and more honest than positives
  for non-designers.
- **The Edits section** ("What must stay exactly as it is?") — a revision-session agenda that
  will save hours. Keep it — as its own form.

## What to change

1. **Prose → taps.** Light/Dark · Warm/Cool · Quiet/Loud · Modern/Classic · Plain/Detailed ·
   Friendly/Authority are spectrum questions pretending to be text fields. Render as tappable
   two-pole sliders or chip pairs. Faster on a phone — and they land as **data** you can
   compare across clients, not prose you re-read each time.
2. **Merge the vibe overlap.** "What should it feel like?" / "What should people think or
   feel?" / "Pick emojis" / "What should it NOT feel like?" is one question wearing four hats.
   Merge to: *feel like* (chips + emojis) · *NOT feel like* (one line) · *what should people do*
   (action chips).
3. **The coolors link is a trap.** Asking a dessert-shop owner to generate hex palettes hands
   them your job with unfamiliar tools. Replace with: "Got colors already? (sign, uniforms,
   Instagram, packaging) — drop a photo or link. Not sure? We'll sort it." Keep coolors as an
   optional extra for the clients who enjoy it.
4. **Photos/logo** → chip answer (Have some / Not yet) + optional upload. Never required.
5. **Missing questions** (all cheap to ask, expensive to chase later):
   - **contact details** — name, business, reply-to (don't assume the quote builder gave them)
   - **languages — EN / VI / both?** (your market)
   - existing domain / socials
   - who their customers are (one line)
   - how they found you (one chip — attribution)
   - a scope anchor: "which tier are you thinking — Standard / +Fancy / not sure" (ties the
     form back to the quote builder they just played with)
6. **"Theme — [template sites]"** → replace with 3–4 of **your own** past/template examples to
   react to (yes-ish / no-ish each). Blank-page clients can't shop templates; they can have
   opinions about yours.

## Proposed v1 shape — 7 + optional

Every question tappable or one line:

1. Business + what it does (one line)
2. What should people **do** on the site? (call / book / come in / buy — chips)
3. Have photos & logo? (chips + upload)
4. Feel like / NOT feel like (chips + one line)
5. 3 things you love (links / pics / a shop sign) + 1 you'd hate
6. Live by when? (this month / next month / no rush)
7. Anything else?

**Go deeper** (collapsible, optional): the Look spectrums · layout preference · pages &
structure · the Your Business block · examples detail.

## Mechanics (when we build)

- One section per screen, progress dots, save-as-you-go (localStorage), phone-first.
- Submit → D1 `submissions` table + instant email ping via Resend (your account, your domain —
  transactional, no client accounts needed).
- Tappable answers stored as fields, prose kept raw: **a partial submit still counts as a lead**.
- Spam at your scale: honeypot + submit-time trap, no captcha.
- The Database tile already promises "Submissions" — the form becomes its live demo. The site
  demos its own offer.

## The Edits form — separate, for the revision round

Same machinery, six questions: **What must stay exactly as it is? · What do you want changed? ·
What's good, what feels off? · Is this you? · Too much or too little? · Anything else?** —
send the link before each revision session; the answers open the session. Turns 60–90 minutes
of show-and-tell into a decision meeting.

## Open questions for Frank

1. **Required/optional split as above** — or do you want one long form the motivated client
   can pour into?
2. **Where submissions land**: email ping only (my pick at your scale) or a small
   login-gated submissions page?
3. **Edits form scope**: ship inside the site as part of the Revision flow, or keep it as your
   own process document?
