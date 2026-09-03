import { ANALYST, ORG_ADDRESS, ORG_NAME, TODAY } from "./seed";
import type { Analysis } from "./types";
import { baths, dateLong, dateShort, money, num, pct } from "./format";

export const LEGAL_FOOTER =
  "Draft prepared for human review. Not legal advice. Not a filing. Comparable sales are synthetic demonstration data.";

export const BOE_ADDRESS = ["King County Board of Equalization", "516 Third Avenue, Room 1222", "Seattle, WA 98104"];

function pad(s: string, w: number, right = false): string {
  if (s.length >= w) return s;
  return right ? " ".repeat(w - s.length) + s : s + " ".repeat(w - s.length);
}

export function compTable(a: Analysis): string {
  const rows = a.comps.map((c, i) => [
    String(i + 1),
    `${c.address}, ${c.city}`,
    dateLong(c.saleDate),
    money(c.salePrice),
    num(c.sqft),
    money(c.pricePerSqft),
    (c.netAdjustment >= 0 ? "+" : "−") + money(Math.abs(c.netAdjustment)),
    money(c.adjustedPrice),
  ]);
  const head = ["#", "Address", "Sale date", "Sale price", "SF", "$/SF", "Net adj.", "Adjusted"];
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (r: string[]) => r.map((cell, i) => pad(cell, widths[i], i >= 3 || i === 0)).join("  ");
  return [line(head), widths.map((w) => "-".repeat(w)).join("  "), ...rows.map(line)].join("\n");
}

// Deterministic composer. Used only for the explicit offline preview.
export function composeLetter(a: Analysis): string {
  const s = a.subject;
  const requested = a.indicatedValue;
  const diff = s.assessedValue - requested;
  const compsProse = a.comps
    .map((c, i) => {
      const adj = c.adjustments.length
        ? c.adjustments.map((x) => `${x.label.toLowerCase()} ${x.amount >= 0 ? "+" : "−"}${money(Math.abs(x.amount))}`).join(", ")
        : "no adjustments";
      return `Sale ${i + 1}: ${c.address}, ${c.city}, sold ${dateLong(c.saleDate)} for ${money(c.salePrice)} (${num(c.sqft)} sq ft, ${money(c.pricePerSqft)} per sq ft, ${c.beds} bed / ${baths(c.baths)} bath, built ${c.yearBuilt}, ${c.distanceMi.toFixed(1)} mi from the subject). Adjustments: ${adj}. Adjusted price ${money(c.adjustedPrice)}.`;
    })
    .join("\n\n");

  const grounds = a.grounds.map((g, i) => `${i + 1}. ${g}`).join("\n\n");

  return `${ORG_NAME}
${ORG_ADDRESS.join("\n")}

${dateLong(TODAY)}

${BOE_ADDRESS.join("\n")}

Re:  Petition for review of real property assessment
     Parcel No. ${s.parcel}
     ${s.address}, ${s.city}, WA ${s.zip}
     Assessment year ${a.assessmentYear} (valuation date ${dateLong(a.valuationDate)})

Dear Members of the Board:

${ORG_NAME} submits this petition as authorized agent for the owner of the above-referenced property. The King County Assessor has set the total assessed value for the ${a.assessmentYear} assessment year at ${money(s.assessedValue)}. Based on the comparable sales analysis below, the true and fair value of the property as of ${dateLong(a.valuationDate)} was not more than ${money(requested)}. We respectfully request that the Board reduce the assessment to ${money(requested)}, a reduction of ${money(diff)} (${pct(a.overAssessedPct).replace("+", "")} of the indicated value).

1. Subject property

The subject is a ${s.beds}-bedroom, ${baths(s.baths)}-bath single-family residence of ${num(s.sqft)} square feet on a ${num(s.lotSqft)} square foot lot, built in ${s.yearBuilt}. The current assessment implies ${money(a.assessedPpsf)} per square foot of living area.

2. Comparable sales

${a.comps.length} arm's-length sales of similar homes within ${a.searchRadiusMi.toFixed(1)} miles of the subject and within twelve months were selected. Each was adjusted for time of sale, living area, bath count, age, and lot size. Adjustments are stated relative to the subject.

${compTable(a)}

${compsProse}

3. Indicated value

Adjusted prices were weighted by proximity, recency, and similarity in living area. The weighted indication is ${money(requested)}, or ${money(a.indicatedPpsf)} per square foot, against a neighborhood median of ${money(a.neighborhoodPpsf)} per square foot for unadjusted sales.

4. Market trend

The twelve-month median price per square foot in the subject's submarket moved ${pct(a.trendPct)} across the analysis period. Comparable sales were time-adjusted to current conditions before weighting, so the indicated value already reflects that movement.

5. Grounds

${grounds}

6. Requested relief

RCW 84.40.030 requires that property be valued at one hundred percent of its true and fair value in money. The evidence above shows the assessment exceeds that standard. The petitioner requests that the Board set the ${a.assessmentYear} assessed value of Parcel No. ${s.parcel} at ${money(requested)}.

Respectfully submitted,

${ANALYST.name}
${ANALYST.title}, ${ORG_NAME}
Authorized agent for taxpayer

Enclosures: comparable sales summary, adjustment schedule, twelve-month trend exhibit

—
${LEGAL_FOOTER}`;
}

// Checks that a model-written letter still cites the analysis it was given.
export function validateLetter(text: string, a: Analysis): string[] {
  const missing: string[] = [];
  const norm = text.replace(/\s+/g, " ");
  const has = (needle: string) => norm.includes(needle);
  if (!has(a.subject.parcel)) missing.push("parcel number");
  if (!has(money(a.subject.assessedValue))) missing.push(`assessed value ${money(a.subject.assessedValue)}`);
  if (!has(money(a.indicatedValue))) missing.push(`indicated value ${money(a.indicatedValue)}`);
  for (const c of a.comps) {
    const label = `comp ${c.address}`;
    if (!has(c.address)) missing.push(`${label} address`);
    if (!has(dateLong(c.saleDate)) && !has(dateShort(c.saleDate))) missing.push(`${label} sale date`);
    if (!has(money(c.salePrice))) missing.push(`${label} sale price`);
    if (!has(num(c.sqft))) missing.push(`${label} square feet`);
    if (!has(money(c.pricePerSqft))) missing.push(`${label} $/sqft`);
    if (!has(money(c.adjustedPrice))) missing.push(`${label} adjusted price`);
    for (const adj of c.adjustments) {
      if (!has(money(Math.abs(adj.amount)))) missing.push(`${label} ${adj.label.toLowerCase()} adjustment`);
    }
  }
  if (!/84\.40\.030/.test(norm)) missing.push("RCW 84.40.030");
  return missing;
}
