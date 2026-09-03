import Link from "next/link";
import { LegalFooter } from "@/components/Footer";
import { Button, Wordmark } from "@/components/ui";
import { PLANS, SUBJECTS } from "@/lib/seed";
import { dateShort, money, moneySigned, num } from "@/lib/format";
import { analyzeSubject } from "@/lib/agent";

const STEPS = [
  ["Parse subject", "Address and assessed value in. Parcel, size, age, and lot resolved."],
  ["Retrieve sales", "Nearby arm's-length sales within twelve months and a similar size band."],
  ["Adjust", "Time, living area, baths, age, lot. Every line visible and editable."],
  ["Trend", "Twelve-month median price per square foot for the submarket."],
  ["Grounds", "Which arguments the data actually supports, and which it does not."],
  ["Letter", "A Board of Equalization petition letter that cites each comparable by address and date."],
];

export default function Pitch() {
  const sample = analyzeSubject(SUBJECTS[0]);
  const s = sample.subject;

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <Wordmark />
          <nav className="flex items-center gap-1 md:gap-2">
            <Link href="#pricing" className="hidden min-h-11 items-center px-3 text-sm text-ink-700 hover:text-ink-950 md:inline-flex">
              Pricing
            </Link>
            <Button href="/login" variant="secondary">
              Sign in
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pb-12 pt-12 md:px-6 md:pb-20 md:pt-24">
          <p className="text-xs font-medium uppercase tracking-wider text-ink-500">For property-tax appeal firms</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight text-ink-950 md:text-6xl">Board-ready appeals from an address.</h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-700">Comps, trend, grounds, and the letter, drafted for your analyst to sign. Per seat, not per appeal.</p>
          <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Button href="/login" size="lg">
              Continue as Northshore Appeals
            </Button>
            <Link href="#how" className="inline-flex min-h-11 items-center text-sm text-ink-700 underline-offset-4 hover:underline">
              How it works
            </Link>
          </div>
          <p className="mt-4 text-xs text-ink-500">Interactive demo. Synthetic King County comps. Letters drafted live by gemini-3.8-flash on Vertex AI.</p>
        </section>

        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-3 md:px-6 md:py-20">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-500">The problem</h2>
              <p className="mt-3 text-lg font-medium leading-snug text-ink-950">Firms win on comps and lose on time.</p>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">
                The filing window is sixty days. Every case needs the same research: pull sales, adjust by hand in a spreadsheet, eyeball a trend, write the
                letter again. Analysts spend the window on the repetitive half and rush the judgment half.
              </p>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-500">The product</h2>
              <p className="mt-3 text-lg font-medium leading-snug text-ink-950">One click from subject to draft, with every step visible.</p>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">
                An in-process comps agent runs a transparent timeline. The letter is grounded: every number in it traces to a comparable row the analyst can
                see, weigh, and edit before it goes anywhere.
              </p>
            </div>
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-500">The model</h2>
              <p className="mt-3 text-lg font-medium leading-snug text-ink-950">Seats, not transactions.</p>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">
                A firm buys a desk. Unlimited cases per seat, reviewer sign-off, shared templates. No revenue share on your contingency fee.
              </p>
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-20">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">How the agent works</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-700">
            Six steps, each shown in the workstation as it runs. Drafting is done by gemini-3.8-flash on Vertex AI from the selected comparables, and the
            draft is rejected if it drops or changes a figure. The prototype runs over a committed synthetic sales set.
          </p>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="rounded-lg border border-stone-200 bg-white p-5">
                <div className="text-xs font-medium text-ink-500 tnum">0{i + 1}</div>
                <div className="mt-2 font-medium text-ink-950">{t}</div>
                <p className="mt-1 text-sm leading-relaxed text-ink-700">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-stone-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1fr_1.2fr] md:px-6 md:py-20">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">A letter a board will read</h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">
                Formal, numbered, and specific. Parcel, assessment year, assessed and requested value, the comparable table, adjustments, trend, grounds, and
                relief under RCW 84.40.030. Drafted for human review, never filed by the software.
              </p>
            </div>
            <div className="min-w-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
              <div className="letter-body px-4 py-4 text-[12px] text-ink-700 md:text-[13px]">
                {`Re:  Petition for review of real property assessment
     Parcel No. ${s.parcel}
     ${s.address}, ${s.city}, WA ${s.zip}

Dear Members of the Board:

Northshore Appeals submits this petition as authorized agent for the owner. The Assessor has set the ${sample.assessmentYear} assessed value at ${money(s.assessedValue)}. ${sample.comps.length} adjusted sales within ${sample.searchRadiusMi.toFixed(1)} miles indicate a true and fair value of ${money(sample.indicatedValue)}. We respectfully request that the Board reduce the assessment to ${money(sample.indicatedValue)} …`}
              </div>
              <div className="border-t border-stone-200 bg-white">
                <div className="flex items-center justify-between px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-ink-500">
                  <span>Comparable sales, excerpt</span>
                  <span>{sample.comps.length} of {sample.comps.length}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs tnum">
                    <thead className="text-left text-[11px] text-ink-500">
                      <tr className="border-t border-stone-200">
                        <th className="px-4 py-1.5 font-medium">Sale</th>
                        <th className="px-2 py-1.5 text-right font-medium">Sold</th>
                        <th className="px-2 py-1.5 text-right font-medium">Price</th>
                        <th className="px-2 py-1.5 text-right font-medium">Net adj.</th>
                        <th className="px-4 py-1.5 text-right font-medium">Adjusted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sample.comps.slice(0, 2).map((c) => (
                        <tr key={c.id} className="border-t border-stone-200">
                          <td className="whitespace-nowrap px-4 py-1.5">
                            {c.address}
                            <span className="text-ink-500"> · {num(c.sqft)} sf</span>
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-right">{dateShort(c.saleDate)}</td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-right">{money(c.salePrice)}</td>
                          <td className={`whitespace-nowrap px-2 py-1.5 text-right ${c.netAdjustment < 0 ? "text-rust-700" : "text-moss-700"}`}>{moneySigned(c.netAdjustment)}</td>
                          <td className="whitespace-nowrap px-4 py-1.5 text-right font-medium">{money(c.adjustedPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="border-t border-stone-200 px-4 py-2 text-[11px] text-ink-500">Synthetic demonstration sales. Every figure in the letter is checked against this table before the draft is accepted.</div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-20">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Seat pricing</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-700">Monthly, per firm. Unlimited cases on every plan.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.id} className={`rounded-lg border bg-white p-6 ${p.id === "team" ? "border-ink-950" : "border-stone-200"}`}>
                <div className="flex items-baseline justify-between">
                  <div className="font-medium">{p.name}</div>
                  {p.id === "team" ? <span className="text-[11px] font-medium uppercase tracking-wide text-ink-500">Most firms</span> : null}
                </div>
                <div className="mt-3 text-3xl font-semibold tnum">
                  {money(p.priceMonthly)}
                  <span className="text-sm font-normal text-ink-500">/mo</span>
                </div>
                <div className="mt-1 text-sm text-ink-700 tnum">{p.seats} seats</div>
                <p className="mt-3 text-sm leading-relaxed text-ink-700">{p.blurb}</p>
                <Button href="/login" variant={p.id === "team" ? "primary" : "secondary"} className="mt-5 w-full">
                  Start with {p.name}
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-stone-200 bg-ink-950 text-stone-50">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-12 md:flex-row md:items-center md:justify-between md:px-6 md:py-16">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Open the demo desk</h2>
              <p className="mt-1 text-sm text-stone-300">Three seeded King County cases. One is clearly over-assessed.</p>
            </div>
            <Link href="/login" className="inline-flex min-h-12 items-center rounded-md bg-stone-50 px-5 text-base font-medium text-ink-950 hover:bg-stone-200">
              Continue as Northshore Appeals
            </Link>
          </div>
        </section>
      </main>
      <LegalFooter />
    </div>
  );
}
