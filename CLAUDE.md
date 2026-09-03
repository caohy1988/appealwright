# Appealwright

B2B workstation for property-tax appeal firms. Pitch prototype.

## Rules

- Next.js App Router, TypeScript, Tailwind. `npm run build` must pass before any commit that touches code.
- No secrets in git. The only env var is `GOOGLE_GENERATIVE_AI_API_KEY`, optional, read server-side only.
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
