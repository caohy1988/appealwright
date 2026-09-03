import Link from "next/link";
import type { ReactNode } from "react";

type BtnProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "lg";
  className?: string;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-950/40 disabled:opacity-50 disabled:cursor-not-allowed";
const variants = {
  primary: "bg-ink-950 text-stone-50 hover:bg-ink-700",
  secondary: "bg-white text-ink-950 border border-stone-300 hover:bg-stone-100",
  ghost: "text-ink-700 hover:bg-stone-200",
  danger: "bg-white text-rust-700 border border-stone-300 hover:bg-rust-100",
};
const sizes = { md: "min-h-11 px-4 text-sm", lg: "min-h-12 px-5 text-base" };

export function Button({ children, variant = "primary", size = "md", className = "", href, onClick, type = "button", disabled, ariaLabel }: BtnProps) {
  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls} aria-label={ariaLabel}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "moss" | "rust" | "ink" }) {
  const tones = {
    neutral: "bg-stone-200 text-ink-700",
    moss: "bg-moss-100 text-moss-700",
    rust: "bg-rust-100 text-rust-700",
    ink: "bg-ink-950 text-stone-50",
  };
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ${tones[tone]}`}>{children}</span>;
}

export function Stat({ label, value, sub, tone = "neutral" }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "neutral" | "moss" | "rust" }) {
  const color = tone === "moss" ? "text-moss-700" : tone === "rust" ? "text-rust-700" : "text-ink-950";
  return (
    <div className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tnum ${color}`}>{value}</div>
      {sub ? <div className="mt-1 text-xs text-ink-500">{sub}</div> : null}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-stone-200 bg-white ${className}`}>{children}</div>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3">
      <h2 className="text-sm font-semibold text-ink-950">{children}</h2>
      {right}
    </div>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight text-ink-950 ${className}`}>
      <span aria-hidden className="inline-block h-4 w-4 rounded-sm bg-ink-950" />
      Appealwright
    </span>
  );
}
