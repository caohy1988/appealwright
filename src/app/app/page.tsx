"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Badge, Button, Card } from "@/components/ui";
import { analyzeSubject } from "@/lib/agent";
import { money, pct } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { CaseStatus, Recommendation } from "@/lib/types";

const STATUS: Record<CaseStatus, { label: string; tone: "neutral" | "moss" | "ink" | "rust" }> = {
  new: { label: "New", tone: "neutral" },
  drafted: { label: "Drafted", tone: "ink" },
  review: { label: "In review", tone: "moss" },
  filed: { label: "Filed", tone: "moss" },
};

const REC: Record<Recommendation, { label: string; tone: "moss" | "neutral" | "rust" }> = {
  appeal: { label: "Appeal", tone: "rust" },
  marginal: { label: "Marginal", tone: "neutral" },
  hold: { label: "Hold", tone: "moss" },
};

export default function Cases() {
  const store = useStore();
  const rows = useMemo(
    () =>
      store.cases.map((c) => {
        const a = analyzeSubject(c);
        return { c, a, hasDraft: Boolean(store.drafts[c.id]) };
      }),
    [store.cases, store.drafts],
  );

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Cases</h1>
          <p className="mt-1 text-sm text-ink-700">King County, 2026 assessment year. Indicated values from the comps agent.</p>
        </div>
        <Button href="/app/new">New case</Button>
      </div>

      <Card className="mt-6 overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block">
          <table className="w-full text-sm">
            <thead className="bg-stone-100 text-left text-[11px] font-medium uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-2">Subject</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Assessed</th>
                <th className="px-4 py-2 text-right">Indicated</th>
                <th className="px-4 py-2 text-right">Gap</th>
                <th className="px-4 py-2">Call</th>
                <th className="px-4 py-2 text-right"></th>
              </tr>
            </thead>
            <tbody className="tnum">
              {rows.map(({ c, a, hasDraft }) => (
                <tr key={c.id} className="border-t border-stone-200 hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <Link href={`/app/cases/${c.id}`} className="font-medium hover:underline">
                      {c.address}
                    </Link>
                    <div className="text-xs text-ink-500">
                      {c.city}, WA {c.zip} · Parcel {c.parcel}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">{money(c.assessedValue)}</td>
                  <td className="px-4 py-3 text-right">{money(a.indicatedValue)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${a.overAssessedPct >= 6 ? "text-rust-700" : a.overAssessedPct >= 3 ? "text-ink-950" : "text-ink-500"}`}>
                    {pct(a.overAssessedPct)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={REC[a.recommendation].tone}>{REC[a.recommendation].label}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button href={`/app/cases/${c.id}`} variant={hasDraft ? "secondary" : "primary"}>
                      {hasDraft ? "Open" : "Draft appeal"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <ul className="divide-y divide-stone-200 md:hidden">
          {rows.map(({ c, a, hasDraft }) => (
            <li key={c.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/app/cases/${c.id}`} className="flex min-h-11 items-center truncate font-medium">
                    {c.address}
                  </Link>
                  <div className="text-xs text-ink-500">
                    {c.city}, WA · {c.parcel}
                  </div>
                </div>
                <Badge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</Badge>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs tnum">
                <div>
                  <dt className="text-ink-500">Assessed</dt>
                  <dd className="font-medium">{money(c.assessedValue)}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Indicated</dt>
                  <dd className="font-medium">{money(a.indicatedValue)}</dd>
                </div>
                <div>
                  <dt className="text-ink-500">Gap</dt>
                  <dd className={`font-medium ${a.overAssessedPct >= 6 ? "text-rust-700" : ""}`}>{pct(a.overAssessedPct)}</dd>
                </div>
              </dl>
              <div className="mt-3 flex items-center justify-between gap-3">
                <Badge tone={REC[a.recommendation].tone}>{REC[a.recommendation].label}</Badge>
                <Button href={`/app/cases/${c.id}`} variant={hasDraft ? "secondary" : "primary"}>
                  {hasDraft ? "Open" : "Draft appeal"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <p className="mt-3 text-xs text-ink-500">Subjects and comparables are synthetic demo records. Gap is assessed value over indicated value. Cases you add live in this browser only.</p>
    </div>
  );
}
