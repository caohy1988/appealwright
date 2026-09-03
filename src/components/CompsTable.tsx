import { baths, dateShort, money, moneySigned, num } from "@/lib/format";
import type { AdjustedComp } from "@/lib/types";
import { Badge } from "./ui";

export function CompsTable({ comps }: { comps: AdjustedComp[] }) {
  return (
    <>
      {/* md and up: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-left text-[11px] font-medium uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Sale</th>
              <th className="px-3 py-2 text-right">Date</th>
              <th className="px-3 py-2 text-right">Price</th>
              <th className="px-3 py-2 text-right">SF</th>
              <th className="px-3 py-2 text-right">$/SF</th>
              <th className="px-3 py-2 text-right">Dist.</th>
              <th className="px-3 py-2">Adjustments</th>
              <th className="px-3 py-2 text-right">Adjusted</th>
            </tr>
          </thead>
          <tbody className="tnum">
            {comps.map((c, i) => (
              <tr key={c.id} className="border-t border-stone-200 align-top">
                <td className="px-3 py-2.5 text-ink-500">{i + 1}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <div className="font-medium">{c.address}</div>
                  <div className="text-xs text-ink-500">
                    {c.city} · {c.neighborhood} · {c.beds} bd / {baths(c.baths)} ba · {c.yearBuilt}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">{dateShort(c.saleDate)}</td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">{money(c.salePrice)}</td>
                <td className="px-3 py-2.5 text-right">{num(c.sqft)}</td>
                <td className="px-3 py-2.5 text-right">{money(c.pricePerSqft)}</td>
                <td className="px-3 py-2.5 text-right">{c.distanceMi.toFixed(1)} mi</td>
                <td className="min-w-[220px] px-3 py-2.5">
                  <AdjList comp={c} />
                </td>
                <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap">{money(c.adjustedPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* small screens: cards */}
      <ul className="divide-y divide-stone-200 md:hidden">
        {comps.map((c, i) => (
          <li key={c.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-ink-500">Sale {i + 1}</div>
                <div className="truncate font-medium">{c.address}</div>
                <div className="text-xs text-ink-500">
                  {c.city} · {c.beds} bd / {baths(c.baths)} ba · {num(c.sqft)} sf · {c.yearBuilt}
                </div>
              </div>
              <div className="shrink-0 text-right tnum">
                <div className="font-medium">{money(c.adjustedPrice)}</div>
                <div className="text-xs text-ink-500">adjusted</div>
              </div>
            </div>
            <dl className="mt-2 grid grid-cols-3 gap-x-3 gap-y-1 text-xs tnum">
              <div>
                <dt className="text-ink-500">Sold</dt>
                <dd>{dateShort(c.saleDate)}</dd>
              </div>
              <div>
                <dt className="text-ink-500">Price</dt>
                <dd>{money(c.salePrice)}</dd>
              </div>
              <div>
                <dt className="text-ink-500">$/SF · dist.</dt>
                <dd>
                  {money(c.pricePerSqft)} · {c.distanceMi.toFixed(1)} mi
                </dd>
              </div>
            </dl>
            <div className="mt-2">
              <AdjList comp={c} />
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 border-t border-stone-200 px-4 py-2 text-[11px] text-ink-500">
        <Badge>Demo data</Badge>
        <span>Synthetic King County sales committed with the prototype. Not MLS or assessor records.</span>
      </div>
    </>
  );
}

function AdjList({ comp }: { comp: AdjustedComp }) {
  if (!comp.adjustments.length) return <span className="text-xs text-ink-500">None</span>;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs tnum">
      {comp.adjustments.map((a) => (
        <span key={a.label} className="whitespace-nowrap">
          <span className="text-ink-500">{a.label}</span>{" "}
          <span className={a.amount < 0 ? "text-rust-700" : "text-moss-700"}>{moneySigned(a.amount)}</span>
        </span>
      ))}
      <span className="whitespace-nowrap font-medium">Net {moneySigned(comp.netAdjustment)}</span>
    </div>
  );
}
