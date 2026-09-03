# Appealwright

B2B workstation for property-tax appeal firms. Pitch prototype.

## Rules

- Next.js App Router, TypeScript, Tailwind. `npm run build` must pass before any commit that touches code.
- No secrets in git. Env vars, all server-side only: `GOOGLE_CLOUD_PROJECT` (default `test-project-0728-467323`), `GOOGLE_CLOUD_LOCATION` (default `global`), `GOOGLE_GENERATIVE_AI_API_KEY` (fallback when ADC is unavailable). Never read, print, or commit `~/.gemini_api_key` or tokens.
- P0: the letter is drafted live by `gemini-3.8-flash` (Vertex AI, ADC first, API key fallback) from `POST /api/draft`, grounded on the selected comps. Model errors are shown to the user. The deterministic composer is only an explicit "Offline preview".
- P0: responsive. 375px and 1280px, no horizontal overflow, 44px tap targets, comps table at `md`+ and cards below, sidebar on desktop and drawer on mobile.
- Demo tenant is Northshore Appeals (Kirkland, King County, WA). Do not reference other appeal firms' brands, copy, or fee models in the product.
- Comps are committed synthetic demo data in `src/lib/seed.ts`. Never scrape listing sites. Never present demo data as live MLS or assessor data.
- Every letter and every page carries the legal footer: draft for human review, not legal advice, not a filing.
- Design: ink and stone palette, Geist fonts, no purple gradients, no emoji as UI.

## Layout

- `src/lib` data model, seed, agent, letter composer, client store.
- `src/app` routes. `/app/*` is the authenticated workstation behind a demo session.
- `src/components` shared UI.

## Commands

- `npm run dev`
- `npm run build`
- `npm run lint`
