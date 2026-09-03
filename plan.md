# Plan

1. Docs first: intent, spec, plan, CLAUDE, REVIEW. Commit on `feat/pitch-prototype`.
2. Scaffold Next.js App Router + TypeScript + Tailwind in place (no nested repo). Add Geist via `next/font`.
3. `src/lib/`
   - `types.ts` data model.
   - `seed.ts` three seeded subjects, ten synthetic King County comps, org, members, plans.
   - `agent.ts` locate, comps, adjust, trend, grounds, composer. Pure functions plus an async runner that yields step events.
   - `letter.ts` deterministic BOE letter composer.
   - `store.ts` client store over localStorage: session, cases, analyses, letter edits, seats.
   - `format.ts` currency, dates, percent.
4. `src/app/api/draft/route.ts` (P0): gemini-3.8-flash via Vertex ADC, API-key fallback, grounded on comps JSON, visible errors. `src/lib/gemini.ts` transport and prompt.
5. UI
   - `/` pitch page.
   - `/login` demo login.
   - `/app` layout with sidebar nav, session guard.
   - `/app` case list.
   - `/app/new` new case form.
   - `/app/cases/[id]` workstation: agent timeline, subject card, comps table, sparkline, grounds, letter editor with copy and print.
   - `/app/settings/seats` seats page.
   - Shared: `Footer`, `Sparkline`, `Button`, `Badge`, `Stat`.
6. Print stylesheet for the letter.
6b. Responsive pass (P0): 375 and 1280, drawer nav, comp cards on small screens, 44px targets.
7. `npm run build` green. Fix lint and type errors.
8. Commit, push, open PR against main.
