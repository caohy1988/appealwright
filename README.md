# Appealwright

B2B workstation for property-tax appeal firms: a comps-research agent plus a board-ready appeal letter, with seat-based subscriptions.

Pitch prototype. Drafts are for human review, not legal advice, not a filing. Comparable sales are synthetic demonstration data.

## Run

```
npm install
npm run dev
```

Open http://localhost:3000, click "Continue as Northshore Appeals".

## 30-second demo

1. Open `/` and click **Continue as Northshore Appeals**.
2. On the case list, open **10416 NE 132nd Pl** (the Juanita case, clearly over-assessed).
3. Watch the agent timeline run. The letter step calls gemini-3.8-flash on Vertex AI and takes 15 to 35 seconds. The label under "Appeal letter" reads `Vertex AI · gemini-3.8-flash · test-project-0728-467323 / global`.
4. Read the letter. Every comparable is cited by address, date, price, size, $/sqft, signed adjustments, and adjusted price. The server rejects any draft that drops or changes one of those figures.
5. Optional: untick a comparable in the table, then **Redraft**. The indicated value updates instantly and the new letter cites only the remaining sales.
6. Copy or Print / PDF. The print view is the letter alone.

`npm test` runs the validator, parser, seat-rule, and Vertex-deadline suites.

## Environment

The appeal letter is drafted live by `gemini-3.8-flash` on Vertex AI, and only Vertex AI. The server route `POST /api/draft` authenticates with a service account when one is configured, otherwise with Application Default Credentials, under a single 25-second deadline. The server then inserts the computed comparable table and validates that every selected comparable is cited as a unit; an ungrounded draft is a 422 and is not saved. If the call fails, the UI shows the error. The deterministic composer is only available behind the "Offline preview" control.

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

- `npm run dev`, `npm test`, `npm run build`, `npm run lint`
- `npx tsx scripts/check-analysis.ts` prints the analysis for the seeded subjects.
