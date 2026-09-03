import { monthLabel } from "@/lib/format";
import type { TrendPoint } from "@/lib/types";

export function Sparkline({ points, height = 64 }: { points: TrendPoint[]; height?: number }) {
  const w = 320;
  const h = height;
  const pad = 6;
  const ys = points.map((p) => p.medianPpsf);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const x = (i: number) => pad + (i * (w - pad * 2)) / (points.length - 1);
  const y = (v: number) => h - pad - ((v - min) / span) * (h - pad * 2);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.medianPpsf).toFixed(1)}`).join(" ");
  const area = `${d} L${x(points.length - 1).toFixed(1)},${h - pad} L${x(0).toFixed(1)},${h - pad} Z`;
  const last = points[points.length - 1];
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="block h-auto w-full" role="img" aria-label="Twelve month median price per square foot">
        <path d={area} fill="#e3efe7" />
        <path d={d} fill="none" stroke="#23603f" strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(points.length - 1)} cy={y(last.medianPpsf)} r="3" fill="#23603f" />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-ink-500 tnum">
        <span>{monthLabel(points[0].month)}</span>
        <span>{monthLabel(points[Math.floor(points.length / 2)].month)}</span>
        <span>{monthLabel(last.month)}</span>
      </div>
    </div>
  );
}
