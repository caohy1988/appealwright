# Spec

## Stack

- Next.js App Router, TypeScript, Tailwind CSS.
- Geist Sans and Geist Mono via `next/font`.
- No database. Seed data and the agent are in-process TypeScript. Client-side state persists to `localStorage` for the demo session (login, user-created cases, seat changes, letter edits).
- Optional LLM polish: if `GOOGLE_GENERATIVE_AI_API_KEY` is present in the server environment, the letter is polished with `gemini-3.8-flash` via a route handler. Otherwise the deterministic composer output is used unchanged. The UI labels which path produced the letter.
- `npm run build` must pass. No secrets in git.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Pitch: problem, product, how the agent works, seat pricing, CTA. Legal footer. |
| `/login` | One button: "Continue as Northshore Appeals". Sets demo session, redirects to `/app`. |
| `/app` | Case list. Three seeded King County subjects, one clearly over-assessed. Status, assessed value, indicated value, gap. New case button. |
| `/app/new` | Address, assessed value, optional facts. "Draft appeal" creates a case and opens the workstation with the agent running. |
| `/app/cases/[id]` | Workstation: subject facts, agent timeline, comps table, 12-month trend sparkline, grounds, letter editor with copy and print/PDF. |
| `/app/settings/seats` | Seats: plan card, seat usage meter, member table with invite and deactivate, plan switcher (UI only). |

All `/app/*` routes require the demo session; otherwise redirect to `/login`.

## Data model

```ts
type Subject = {
  id: string;
  address: string;      // street
  city: string;         // Kirkland, Bellevue, Redmond, ...
  parcel: string;       // synthetic King County-style parcel number
  assessedValue: number;
  beds: number; baths: number; sqft: number; lotSqft: number; yearBuilt: number;
  lat: number; lng: number;
  status: 'new' | 'drafted' | 'review' | 'filed';
  createdAt: string;
};

type Comp = {
  id: string;
  address: string; city: string;
  beds: number; baths: number; sqft: number; lotSqft: number; yearBuilt: number;
  saleDate: string;     // ISO
  salePrice: number;
  lat: number; lng: number;
  source: 'demo-synthetic';
};

type AdjustedComp = Comp & {
  distanceMi: number;
  monthsAgo: number;
  pricePerSqft: number;
  adjustments: { label: string; amount: number }[];
  adjustedPrice: number;
  adjustedPricePerSqft: number;
  weight: number;
};

type AgentStep = {
  key: 'locate' | 'comps' | 'adjust' | 'trend' | 'grounds' | 'letter';
  title: string;
  status: 'pending' | 'running' | 'done';
  detail?: string;
  startedAt?: number; finishedAt?: number;
};

type Analysis = {
  subject: Subject;
  comps: AdjustedComp[];
  trend: { month: string; medianPpsf: number }[];
  trendPct: number;                // 12-month change in median $/sqft
  indicatedValue: number;
  indicatedPpsf: number;
  overAssessedBy: number;          // assessed - indicated (may be negative)
  overAssessedPct: number;
  grounds: string[];
  letter: string;
  letterModel: 'deterministic' | 'gemini-3.8-flash';
};
```

## Agent v0

In-process, deterministic, over a committed seed of 10 synthetic King County sales.

1. **locate**: parse address, geocode against seed subject or a stable hash-derived coordinate near Kirkland for pasted addresses.
2. **comps**: select sales within 1.5 mi and 12 months, same rough size band (±35% sqft). Fallback widens radius to 3 mi if fewer than 4.
3. **adjust**: line adjustments per comp: size ($/sqft delta × sqft difference at 50% of neighborhood $/sqft), bath count ($12,500 per bath), age (0.4% per year of difference, capped), time (trend-adjusted to today), lot (small). Weight by distance and recency. Indicated value is weighted mean of adjusted prices, rounded to nearest $1,000.
4. **trend**: monthly median $/sqft for the last 12 months across all seed sales, smoothed with a fixed drift so the sparkline is meaningful.
5. **grounds**: pick applicable grounds from a fixed list based on data: comps indicate lower value; assessment exceeds 100% of market value under RCW 84.40.030; assessment inconsistent with trend; size or condition adjustments.
6. **letter**: deterministic composer produces a formal letter to the King County Board of Equalization with parcel, assessed value, requested value, comp table in prose, adjustments, trend, grounds, and a closing. If Gemini key present, polish preserving all numbers.

## Letter requirements

- Addressed to King County Board of Equalization, correct in tone for a Washington BOE petition cover letter.
- States parcel number, assessment year, assessed value, requested value, dollar and percent difference.
- Enumerates comps with address, sale date, sale price, size, $/sqft, adjusted price.
- States indicated value method.
- Cites RCW 84.40.030 (true and fair value) plainly, without overclaiming.
- Requests the board reduce the assessment to the indicated value.
- Signature block: analyst at Northshore Appeals as authorized agent.
- Footer: "Draft prepared for human review. Not legal advice. Not a filing. Comparable sales are demonstration data."

## Seats

- Plans: Starter 3 seats $99/mo, Team 10 seats $299/mo, Firm 25 seats $799/mo.
- Demo org: Northshore Appeals on Team, 4 of 10 seats filled.
- Invite: email input, adds a pending member. Deactivate: sets member inactive, frees a seat. Reactivate allowed.
- Plan switcher: changes plan and seat cap in local state. Blocks downgrade below active seat count with a clear message. No Stripe.

## Design

- Ink and stone palette: near-black text, warm gray surfaces, one restrained accent (deep green) for primary actions and positive deltas, rust for over-assessment deltas.
- Geist Sans for UI, Geist Mono for numbers, parcels, and the letter body.
- Dense, desktop-first layout. Tables with tabular numerals. No gradient blobs, no emoji as UI, no purple.
- Legal footer on every page.

## Out of scope

Real auth, billing, PDF generation server-side (use print stylesheet), live data sources, multi-tenant persistence.
