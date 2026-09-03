# Appealwright

B2B workstation for property-tax appeal firms: a comps-research agent plus a board-ready appeal letter, with seat-based subscriptions.

Pitch prototype. Drafts are for human review, not legal advice, not a filing. Comparable sales are synthetic demonstration data.

## Run

```
npm install
npm run dev
```

Open http://localhost:3000, click "Continue as Northshore Appeals".

## Environment

The appeal letter is drafted live by `gemini-3.8-flash`. The server route `POST /api/draft` tries Vertex AI with Application Default Credentials first, then falls back to the Gemini API key. If both fail, the UI shows the error. The deterministic composer is only available behind the "Offline preview" toggle.

| Variable | Default | Purpose |
| --- | --- | --- |
| `GOOGLE_CLOUD_PROJECT` | `test-project-0728-467323` | Vertex AI project |
| `GOOGLE_CLOUD_LOCATION` | `global` | Vertex AI location |
| `GOOGLE_GENERATIVE_AI_API_KEY` | unset | Gemini API fallback when ADC is unavailable (Vercel) |

Locally, `gcloud auth application-default login` is enough. On Vercel, set `GOOGLE_GENERATIVE_AI_API_KEY` or provide ADC via `GOOGLE_APPLICATION_CREDENTIALS`. Never commit keys.

## Layout

- `src/lib` data model, seed comps, agent, letter composer, Gemini transport, client store.
- `src/app` routes. `/app/*` is the workstation behind a demo session.
- `src/components` shared UI.

## Scripts

- `npm run dev`, `npm run build`, `npm run lint`
- `npx tsx scripts/check-analysis.ts` prints the analysis for the seeded subjects.
