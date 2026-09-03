import { baths, dateShort, money, moneySigned, num } from "@/lib/format";
import type { AdjustedComp } from "@/lib/types";
import { Badge } from "./ui";

type Props = {
  comps: AdjustedComp[];
  excluded?: AdjustedComp[];
  onToggle?: (id: string, include: boolean) => void;
  disabled?: boolean;
  minComps?: number;
};

export function CompsTable({ comps, excluded = [], onToggle, disabled, minComps = 2 }: Props) {
  const rows = [...comps.map((c) => ({ c, included: true })), ...excluded.map((c) => ({ c, included: false }))];
  const canExcludeMore = comps.length > minComps;
  const toggle = (c: AdjustedComp, included: boolean) => {
    if (!onToggle) return;
    if (included && !canExcludeMore) return;
    onToggle(c.id, !included);
  };
  const box = (c: AdjustedComp, included: boolean) =>
    onToggle ? (
      <label className="flex h-11 w-11 cursor-pointer items-center justify-center" title={included && !canExcludeMore ? `Keep at least ${minComps} comparables` : included ? "Exclude from indication" : "Include in indication"}>
        <input
          type="checkbox"
          className="h-4 w-4 accent-ink-950"
          checked={included}
          disabled={disabled || (included && !canExcludeMore)}
          onChange={() => toggle(c, included)}
          aria-label={`${included ? "Exclude" : "Include"} ${c.address}`}
        />
      </label>
    ) : null;

  return (
    <>
      {/* md and up: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead className="bg-stone-100 text-left text-[11px] font-medium uppercase tracking-wide text-ink-500">
            <tr>
              {onToggle ? <th className="px-1 py-2 text-center">Use</th> : null}
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
            {rows.map(({ c, included }, i) => (
              <tr key={c.id} className={`border-t border-stone-200 align-top ${included ? "" : "text-ink-400"}`}>
                {onToggle ? <td className="px-1 py-1 text-center align-middle">{box(c, included)}</td> : null}
                <td className="px-3 py-2.5 text-ink-500">{included ? i + 1 : "–"}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <div className={`font-medium ${included ? "" : "line-through"}`}>{c.address}</div>
                  <div className="text-xs text-ink-500">
                    {c.city} · {c.neighborhood} · {c.beds} bd / {baths(c.baths)} ba · {c.yearBuilt}
                    {included ? null : <span className="ml-1 text-rust-700">excluded</span>}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">{dateShort(c.saleDate)}</td>
                <td className="px-3 py-2.5 text-right whitespace-nowrap">{money(c.salePrice)}</td>
                <td className="px-3 py-2.5 text-right">{num(c.sqft)}</td>
                <td className="px-3 py-2.5 text-right">{money(c.pricePerSqft)}</td>
                <td className="px-3 py-2.5 text-right">{c.distanceMi.toFixed(1)} mi</td>
                <td className="min-w-[220px] px-3 py-2.5">
                  <AdjList comp={c} muted={!included} />
                </td>
                <td className="px-3 py-2.5 text-right font-medium whitespace-nowrap">{money(c.adjustedPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* small screens: cards */}
      <ul className="divide-y divide-stone-200 md:hidden">
        {rows.map(({ c, included }, i) => (
          <li key={c.id} className={`px-4 py-3 ${included ? "" : "text-ink-400"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-1">
                {onToggle ? <div className="-ml-3 -mt-2">{box(c, included)}</div> : null}
                <div className="min-w-0">
                  <div className="text-xs text-ink-500">{included ? `Sale ${i + 1}` : "Excluded"}</div>
                  <div className={`truncate font-medium ${included ? "" : "line-through"}`}>{c.address}</div>
                  <div className="text-xs text-ink-500">
                    {c.city} · {c.beds} bd / {baths(c.baths)} ba · {num(c.sqft)} sf · {c.yearBuilt}
                  </div>
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
              <AdjList comp={c} muted={!included} />
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2 border-t border-stone-200 px-4 py-2 text-[11px] text-ink-500">
        <Badge>Demo data</Badge>
        <span>Synthetic King County sales committed with the prototype. Not MLS or assessor records.</span>
        {onToggle ? <span className="ml-auto">Untick a sale to drop it from the indication and the letter. Minimum {minComps}.</span> : null}
      </div>
    </>
  );
}

function AdjList({ comp, muted }: { comp: AdjustedComp; muted?: boolean }) {
  if (!comp.adjustments.length) return <span className="text-xs text-ink-500">None</span>;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs tnum">
      {comp.adjustments.map((a) => (
        <span key={a.label} className="whitespace-nowrap">
          <span className="text-ink-500">{a.label}</span>{" "}
          <span className={muted ? "" : a.amount < 0 ? "text-rust-700" : "text-moss-700"}>{moneySigned(a.amount)}</span>
        </span>
      ))}
      <span className="whitespace-nowrap font-medium">Net {moneySigned(comp.netAdjustment)}</span>
    </div>
  );
}
