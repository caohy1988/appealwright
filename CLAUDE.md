# Appealwright

B2B workstation for property-tax appeal firms. Pitch prototype.

## Rules

- Next.js App Router, TypeScript, Tailwind. `npm test` and `npm run build` must pass before any commit that touches code.
- No secrets in git. Env vars, all server-side only: `GOOGLE_CLOUD_PROJECT` (default `test-project-0728-467323`), `GOOGLE_CLOUD_LOCATION` (default `global`), and for hosted deploys a service account via `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY` (or inline JSON in `GOOGLE_APPLICATION_CREDENTIALS`). Locally, ADC. Never read, print, or commit keys or tokens.
- P0: the letter is drafted live by `gemini-3.8-flash` on Vertex AI only, from `POST /api/draft`, under one 25s deadline that covers credentials, connection, streaming, and parsing. There is no AI Studio / `GOOGLE_GENERATIVE_AI_API_KEY` path. Model errors are shown to the user. The deterministic composer is only an explicit "Offline preview".
- P0: grounding. The server injects the computed comparable table into every model letter (`injectEvidence`), then `validateLetter` requires each selected comparable to be cited as a unit: one paragraph or one table row naming that comparable alone with its sale date, price, square feet, $/sqft, every signed adjustment, signed net, and adjusted price. Anything missing is a 422 and nothing is saved.
- Drafts are bound to an `inputHash` of subject facts plus included comparable ids. A draft whose hash differs, or that has no hash (pre-hash localStorage), is stale: the workstation shows a Redraft prompt and never migrates a hash onto an old letter. Stale once, redraft, done.
- P0: responsive. 375px and 1280px, no horizontal overflow, 44px tap targets, comps table at `md`+ and cards below, sidebar on desktop and drawer on mobile.
- Demo tenant is Northshore Appeals (Kirkland, King County, WA). Do not reference other appeal firms' brands, copy, or fee models in the product.
- Comps are committed synthetic demo data in `src/lib/seed.ts`. Never scrape listing sites. Never present demo data as live MLS or assessor data.
- Every letter and every page carries the legal footer: draft for human review, not legal advice, not a filing.
- Design: ink and stone palette, Geist fonts, no purple gradients, no emoji as UI.

## Layout

- `src/lib` data model, seed, agent, letter composer and validator, numeric parsing, seat rules, client store.
- `test/` node:test suites run through tsx. Add a test for every validator, parser, or seat-rule change.
- `src/app` routes. `/app/*` is the authenticated workstation behind a demo session.
- `src/components` shared UI.

## Commands

- `npm run dev`
- `npm test`
- `npm run build`
- `npm run lint`
