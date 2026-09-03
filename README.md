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

The appeal letter is drafted live by `gemini-3.8-flash` on Vertex AI, and only Vertex AI. The server route `POST /api/draft` authenticates with a service account when one is configured, otherwise with Application Default Credentials. If the call fails, the UI shows the error. The deterministic composer is only available behind the "Offline preview" toggle.

| Variable | Default | Purpose |
| --- | --- | --- |
| `GOOGLE_CLOUD_PROJECT` | `test-project-0728-467323` | Vertex AI project |
| `GOOGLE_CLOUD_LOCATION` | `global` | Vertex AI location |
| `GOOGLE_CLIENT_EMAIL` | unset | Service-account email for hosted deploys (Vercel) |
| `GOOGLE_PRIVATE_KEY` | unset | Service-account private key; `\n` escapes are accepted |
| `GOOGLE_APPLICATION_CREDENTIALS` | unset | Alternative: inline service-account JSON, or a file path for ADC |

Locally, `gcloud auth application-default login` is enough. On Vercel, set `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY` for a service account with the Vertex AI User role. Never commit keys.

## Layout

- `src/lib` data model, seed comps, agent, letter composer, Gemini transport, client store.
- `src/app` routes. `/app/*` is the workstation behind a demo session.
- `src/components` shared UI.

## Scripts

- `npm run dev`, `npm run build`, `npm run lint`
- `npx tsx scripts/check-analysis.ts` prints the analysis for the seeded subjects.
