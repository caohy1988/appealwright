import { ANALYST, ORG_ADDRESS, ORG_NAME, TODAY } from "./seed";
import type { AdjustedComp, Analysis } from "./types";
import { baths, dateLong, dateShort, money, moneySigned, num, pct } from "./format";

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
    moneySigned(c.netAdjustment),
    money(c.adjustedPrice),
  ]);
  const head = ["#", "Address", "Sale date", "Sale price", "SF", "$/SF", "Net adj.", "Adjusted"];
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (r: string[]) => r.map((cell, i) => pad(cell, widths[i], i >= 3 || i === 0)).join("  ");
  return [line(head), widths.map((w) => "-".repeat(w)).join("  "), ...rows.map(line)].join("\n");
}

// One self-contained paragraph per comparable. Every figure the validator requires is in this one block.
export function compEvidence(a: Analysis): string[] {
  return a.comps.map((c, i) => {
    const adj = c.adjustments.length ? c.adjustments.map((x) => `${x.label.toLowerCase()} ${moneySigned(x.amount)}`).join(", ") : "none";
    return `Sale ${i + 1}: ${c.address}, ${c.city}, sold ${dateLong(c.saleDate)} for ${money(c.salePrice)} (${num(c.sqft)} sq ft, ${money(c.pricePerSqft)} per sq ft, ${c.beds} bed / ${baths(c.baths)} bath, built ${c.yearBuilt}, ${c.distanceMi.toFixed(1)} mi from the subject). Adjustments: ${adj}; net ${moneySigned(c.netAdjustment)}. Adjusted price ${money(c.adjustedPrice)}.`;
  });
}

// Deterministic composer. Used only for the explicit offline preview.
export function composeLetter(a: Analysis): string {
  const s = a.subject;
  const requested = a.indicatedValue;
  const diff = s.assessedValue - requested;
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

${compEvidence(a).join("\n\n")}

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

// Unicode minus and en dash count as a minus sign. Whitespace runs collapse.
const SIGNS = /[−–]/g;
function normalize(s: string): string {
  return s.replace(SIGNS, "-").replace(/\s+/g, " ").trim();
}

function signedForms(n: number): string[] {
  const s = normalize(moneySigned(n));
  if (n === 0) return [s];
  return [s, `${s[0]} ${s.slice(1)}`];
}

type Requirement = { label: string; any: string[] };

function compRequirements(c: AdjustedComp): Requirement[] {
  const ppsf = c.pricePerSqft;
  const reqs: Requirement[] = [
    { label: "sale date", any: [dateLong(c.saleDate), dateShort(c.saleDate)] },
    { label: `sale price ${money(c.salePrice)}`, any: [money(c.salePrice)] },
    { label: `${num(c.sqft)} sq ft`, any: [num(c.sqft)] },
    { label: `${money(ppsf)}/sq ft`, any: [money(ppsf), money(Math.floor(ppsf)), money(Math.ceil(ppsf))] },
    ...c.adjustments.map((x) => ({ label: `${x.label.toLowerCase()} ${moneySigned(x.amount)}`, any: signedForms(x.amount) })),
    { label: `net ${moneySigned(c.netAdjustment)}`, any: signedForms(c.netAdjustment) },
    { label: `adjusted price ${money(c.adjustedPrice)}`, any: [money(c.adjustedPrice)] },
  ];
  return reqs.map((r) => ({ label: r.label, any: r.any.map(normalize) }));
}

type CompStatus = { valid: boolean; missing: string[]; contradictions: string[] };

function moneyTokens(block: string): string[] {
  return block.match(/\$\d{1,3}(?:,\d{3})*(?!\d)/g) ?? [];
}

// Per-comp check. A comparable is cited correctly when one paragraph or one table row names it
// alone and carries every one of its figures, signs included. Any block that names it alone but
// states a dollar figure that is not one of its figures (or a document-wide value) is a contradiction.
function compStatus(blocks: string[], c: AdjustedComp, others: string[], allowedDoc: Set<string>): CompStatus {
  const candidates = blocks.filter((b) => b.includes(c.address) && !others.some((o) => b.includes(o)));
  if (candidates.length === 0) return { valid: false, missing: ["no paragraph or row cites it on its own"], contradictions: [] };
  const reqs = compRequirements(c);
  const allowed = new Set<string>([
    ...allowedDoc,
    money(c.salePrice),
    money(c.pricePerSqft),
    money(Math.floor(c.pricePerSqft)),
    money(Math.ceil(c.pricePerSqft)),
    money(c.adjustedPrice),
    money(Math.abs(c.netAdjustment)),
    ...c.adjustments.map((x) => money(Math.abs(x.amount))),
  ]);
  const contradictions: string[] = [];
  let best: string[] | null = null;
  for (const b of candidates) {
    const miss = reqs.filter((r) => !r.any.some((t) => b.includes(t))).map((r) => r.label);
    if (best === null || miss.length < best.length) best = miss;
    for (const t of moneyTokens(b)) if (!allowed.has(t)) contradictions.push(t);
  }
  return { valid: best!.length === 0 && contradictions.length === 0, missing: best!, contradictions: [...new Set(contradictions)] };
}

function splitBlocks(text: string): string[] {
  const raw = text.replace(SIGNS, "-");
  return [...raw.split(/\n[ \t]*\n/), ...raw.split("\n")].map(normalize).filter(Boolean);
}

function docValues(a: Analysis): Set<string> {
  return new Set([money(a.subject.assessedValue), money(a.indicatedValue), money(a.assessedPpsf), money(a.indicatedPpsf), money(a.neighborhoodPpsf), money(a.overAssessedBy)]);
}

// Checks that a letter cites the analysis it was given. Document-wide facts (parcel, values,
// statute) may appear anywhere. Each comparable must be cited as a unit and never mis-stated.
export function validateLetter(text: string, a: Analysis): string[] {
  const missing: string[] = [];
  const doc = normalize(text);
  if (!doc.includes(a.subject.parcel)) missing.push("parcel number");
  if (!doc.includes(money(a.subject.assessedValue))) missing.push(`assessed value ${money(a.subject.assessedValue)}`);
  if (!doc.includes(money(a.indicatedValue))) missing.push(`indicated value ${money(a.indicatedValue)}`);

  const blocks = splitBlocks(text);
  const addresses = a.comps.map((c) => c.address);
  const allowedDoc = docValues(a);
  for (const c of a.comps) {
    const st = compStatus(blocks, c, addresses.filter((x) => x !== c.address), allowedDoc);
    if (st.missing.length > 0) missing.push(`comp ${c.address}: no single paragraph or row also states ${st.missing.join(", ")}`);
    if (st.contradictions.length > 0) missing.push(`comp ${c.address}: a paragraph states ${st.contradictions.join(", ")}, which is not that comparable's figure`);
  }
  if (!/84\.40\.030/.test(doc)) missing.push("RCW 84.40.030");
  return missing;
}

// The evidence is written by the server, never by the model. Guarantees the aligned comparable
// table is present exactly as computed (replacing one the model altered), then adds the evidence
// paragraph for any comparable the letter does not already cite correctly. Idempotent.
export function injectEvidence(text: string, a: Analysis): string {
  const table = compTable(a);
  const expected = table.split("\n").map(normalize);
  const lines = text.split("\n");
  let norm = lines.map(normalize);

  let tableEnd: number;
  if (expected.every((e) => norm.includes(e))) {
    tableEnd = norm.indexOf(expected[expected.length - 1]);
  } else {
    let at: number;
    const header = norm.findIndex((l) => /^# Address Sale date/.test(l));
    if (header >= 0) {
      let end = header;
      while (end + 1 < lines.length && lines[end + 1].trim() !== "") end++;
      lines.splice(header, end - header + 1);
      at = header;
    } else {
      const sec3 = norm.findIndex((l) => /^3\. Indicated value/i.test(l) || /^5\. Grounds/i.test(l));
      const sec2 = norm.findIndex((l) => /^2\. Comparable sales/i.test(l));
      const footer = norm.findIndex((l) => l === "—" || l.startsWith(LEGAL_FOOTER.slice(0, 24)));
      at = sec3 >= 0 ? sec3 : sec2 >= 0 ? sec2 + 1 : footer >= 0 ? footer : lines.length;
    }
    const block = table.split("\n");
    lines.splice(at, 0, "", ...block, "");
    tableEnd = at + block.length;
    norm = lines.map(normalize);
  }

  const blocks = splitBlocks(lines.join("\n"));
  const addresses = a.comps.map((c) => c.address);
  const allowedDoc = docValues(a);
  const evidence = compEvidence(a);
  const toAdd = a.comps.map((c, i) => (compStatus(blocks, c, addresses.filter((x) => x !== c.address), allowedDoc).valid ? null : evidence[i])).filter((x): x is string => x !== null);
  if (toAdd.length > 0) {
    lines.splice(tableEnd + 1, 0, "", ...toAdd.flatMap((p) => [p, ""]));
  }
  const out = lines.join("\n").replace(/\n{3,}/g, "\n\n");
  return out === text ? text : out;
}
