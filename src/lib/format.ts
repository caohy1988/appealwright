const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function money(n: number): string {
  return usd.format(Math.round(n));
}

export function moneySigned(n: number): string {
  const s = usd.format(Math.abs(Math.round(n)));
  if (n > 0) return `+${s}`;
  if (n < 0) return `−${s}`;
  return s;
}

export function num(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export function pct(n: number, digits = 1): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(digits)}%`;
}

export function pctPlain(n: number, digits = 1): string {
  return `${Math.abs(n).toFixed(digits)}%`;
}

export function dateLong(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function dateShort(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function monthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function baths(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
