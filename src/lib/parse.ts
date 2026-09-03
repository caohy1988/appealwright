// Numeric field parsing for the new-case form. Grouping is checked on the original
// string before separators are stripped, so "1,,250,000" and "12,50,000" are rejected.

export type ParseResult = { ok: true; value: number } | { ok: false; empty: true } | { ok: false; empty: false; reason: string };

const GROUPED = /^\d{1,3}(,\d{3})+$/;
const PLAIN = /^\d+$/;

function parseNumber(raw: string, integer: boolean): ParseResult {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: false, empty: true };
  const t = trimmed.replace(/^\$\s*/, "");
  const m = /^([\d,]*)(?:\.(\d*))?$/.exec(t);
  if (!m) return { ok: false, empty: false, reason: "must be a number" };
  const [, int, frac] = m;
  if (int === "" && !frac) return { ok: false, empty: false, reason: "must be a number" };
  if (frac === "") return { ok: false, empty: false, reason: "must be a number" };
  if (int !== "" && !(int.includes(",") ? GROUPED.test(int) : PLAIN.test(int))) {
    return { ok: false, empty: false, reason: "has misplaced commas" };
  }
  if (integer && frac) return { ok: false, empty: false, reason: "must be a whole number" };
  const value = Number((int || "0").replace(/,/g, "") + (frac ? `.${frac}` : ""));
  if (!Number.isFinite(value)) return { ok: false, empty: false, reason: "must be a number" };
  if (integer && !Number.isInteger(value)) return { ok: false, empty: false, reason: "must be a whole number" };
  return { ok: true, value };
}

export function parseMoney(raw: string): ParseResult {
  return parseNumber(raw, true);
}

export function parseInteger(raw: string): ParseResult {
  return parseNumber(raw, true);
}

// Baths may be fractional: "0.5", ".5", "2.5".
export function parseBaths(raw: string): ParseResult {
  return parseNumber(raw, false);
}
