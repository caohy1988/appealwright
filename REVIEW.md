# Review checklist

Use this when reviewing the pitch prototype PR.

## Product

- [ ] `/` explains the problem, the product, and the seat pricing without reading like a generic AI landing page.
- [ ] "Continue as Northshore Appeals" lands on `/app` with three seeded cases; one is clearly over-assessed.
- [ ] `/app/new` accepts an address and assessed value and produces a case with a running agent.
- [ ] Workstation shows the agent timeline progressing through locate, comps, adjust, trend, grounds, letter.
- [ ] Comps table shows sale date, price, size, $/sqft, distance, adjustments, adjusted price.
- [ ] Trend sparkline shows 12 months and a percent change.
- [ ] Letter reads as a real King County BOE petition cover letter, cites the comps by address and date, states indicated vs assessed value, and cites RCW 84.40.030.
- [ ] Letter is editable; copy and print work; print output is letter-only.
- [ ] Live draft label reads "Vertex AI · gemini-3.8-flash · test-project-0728-467323 / global". Offline preview is labelled as such. Nothing calls generativelanguage.googleapis.com or reads an API key.
- [ ] Seats page: Team plan, 4 of 10, invite adds a pending member, deactivate frees a seat, plan switch updates cap and blocks invalid downgrade.
- [ ] Legal footer on every page and at the bottom of the letter.

## Engineering

- [ ] `npm run build` passes clean.
- [ ] No secrets, no `.env` committed.
- [ ] Comps are labelled demo/synthetic in the UI.
- [ ] No external data fetches except the Vertex AI call from `POST /api/draft`.
- [ ] No references to other firms' brands in product copy.

## Design

- [ ] Geist loaded via `next/font`; no layout shift.
- [ ] Ink/stone palette, single accent, tabular numerals in tables.
- [ ] Desktop-first, usable at 1280 and readable at 390.
