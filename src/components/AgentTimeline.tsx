import type { AgentStep } from "@/lib/types";

// Vertical list on small screens, six-column strip on large screens.
export function AgentTimeline({ steps }: { steps: AgentStep[] }) {
  return (
    <ol className="divide-y divide-stone-200 lg:grid lg:grid-cols-6 lg:divide-x lg:divide-y-0">
      {steps.map((s, i) => (
        <li key={s.key} className="flex gap-3 px-4 py-3 lg:flex-col lg:gap-2">
          <div className="flex flex-col items-center pt-0.5 lg:flex-row lg:items-center lg:gap-2">
            <Dot status={s.status} />
            {i < steps.length - 1 ? <div className="mt-1 w-px flex-1 bg-stone-200 lg:hidden" /> : null}
            <span className="hidden text-[11px] text-ink-400 tnum lg:inline">0{i + 1}</span>
            {typeof s.ms === "number" ? <span className="ml-auto hidden text-[11px] text-ink-500 tnum lg:inline">{(s.ms / 1000).toFixed(1)}s</span> : null}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div className={`text-sm ${s.status === "pending" ? "text-ink-400" : "font-medium text-ink-950"}`}>{s.title}</div>
              {typeof s.ms === "number" ? <div className="text-[11px] text-ink-500 tnum lg:hidden">{(s.ms / 1000).toFixed(1)}s</div> : null}
            </div>
            {s.detail ? <div className={`mt-0.5 text-xs leading-relaxed ${s.status === "error" ? "text-rust-700" : "text-ink-500"}`}>{s.detail}</div> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Dot({ status }: { status: AgentStep["status"] }) {
  if (status === "done") return <span className="block h-3 w-3 shrink-0 rounded-full bg-moss-600" />;
  if (status === "running") return <span className="block h-3 w-3 shrink-0 animate-pulse rounded-full bg-ink-950" />;
  if (status === "error") return <span className="block h-3 w-3 shrink-0 rounded-full bg-rust-600" />;
  return <span className="block h-3 w-3 shrink-0 rounded-full border border-stone-300 bg-white" />;
}
