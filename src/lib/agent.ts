import { ASSESSMENT_YEAR, COMPS, TODAY, TREND_FACTORS, TREND_MONTHS, VALUATION_DATE } from "./seed";
import type { AdjustedComp, Adjustment, AgentStep, Analysis, Comp, Recommendation, StepKey, Subject, TrendPoint } from "./types";

// Pure, deterministic analysis over the committed synthetic comp set.

export const STEP_TITLES: Record<StepKey, string> = {
  locate: "Parse subject and locate parcel",
  comps: "Retrieve nearby sales",
  adjust: "Filter and adjust comparables",
  trend: "Compute 12-month median trend",
  grounds: "Identify grounds for appeal",
  letter: "Draft Board of Equalization letter",
};

export function initialSteps(): AgentStep[] {
  return (Object.keys(STEP_TITLES) as StepKey[]).map((key) => ({ key, title: STEP_TITLES[key], status: "pending" }));
}

export function haversineMi(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function monthIndex(iso: string): number {
  const ym = iso.slice(0, 7);
  const i = TREND_MONTHS.indexOf(ym);
  if (i >= 0) return i;
  return ym < TREND_MONTHS[0] ? 0 : TREND_MONTHS.length - 1;
}

function monthsBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + "T12:00:00");
  const b = new Date(toIso + "T12:00:00");
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (30.44 * 86400000)));
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// Stable pseudo-coordinate for pasted addresses, kept inside the Kirkland demo area.
export function locateAddress(address: string): { lat: number; lng: number } {
  let h = 2166136261;
  for (const ch of address.toLowerCase()) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  const a = (h % 1000) / 1000;
  const b = ((h >>> 10) % 1000) / 1000;
  return { lat: 47.688 + a * 0.04, lng: -122.205 + b * 0.03 };
}

export function selectComps(subject: Subject, pool: Comp[] = COMPS): { comps: Comp[]; radius: number } {
  const radii = [1.5, 3, 5];
  for (const radius of radii) {
    const hits = pool.filter((c) => {
      const d = haversineMi(subject.lat, subject.lng, c.lat, c.lng);
      const sizeOk = Math.abs(c.sqft - subject.sqft) / subject.sqft <= 0.35;
      const recent = monthsBetween(c.saleDate, TODAY) <= 12;
      return d <= radius && sizeOk && recent;
    });
    if (hits.length >= 4) return { comps: hits, radius };
  }
  return { comps: pool.filter((c) => haversineMi(subject.lat, subject.lng, c.lat, c.lng) <= 5), radius: 5 };
}

export function adjustComps(subject: Subject, comps: Comp[]): { adjusted: AdjustedComp[]; neighborhoodPpsf: number } {
  const neighborhoodPpsf = median(comps.map((c) => c.salePrice / c.sqft));
  const latest = TREND_FACTORS[TREND_FACTORS.length - 1];
  const adjusted = comps.map((c) => {
    const distanceMi = haversineMi(subject.lat, subject.lng, c.lat, c.lng);
    const monthsAgo = monthsBetween(c.saleDate, TODAY);
    const pricePerSqft = c.salePrice / c.sqft;
    const adjustments: Adjustment[] = [];

    const time = c.salePrice * (latest / TREND_FACTORS[monthIndex(c.saleDate)] - 1);
    if (Math.abs(time) >= 500) adjustments.push({ label: "Time", amount: Math.round(time / 100) * 100 });

    const size = (subject.sqft - c.sqft) * neighborhoodPpsf * 0.5;
    if (Math.abs(size) >= 500) adjustments.push({ label: "Living area", amount: Math.round(size / 100) * 100 });

    const bath = (subject.baths - c.baths) * 12500;
    if (Math.abs(bath) >= 500) adjustments.push({ label: "Baths", amount: Math.round(bath / 100) * 100 });

    const ageRaw = (c.yearBuilt - subject.yearBuilt) * -0.004;
    const age = c.salePrice * Math.max(-0.08, Math.min(0.08, ageRaw));
    if (Math.abs(age) >= 500) adjustments.push({ label: "Age", amount: Math.round(age / 100) * 100 });

    const lot = Math.max(-25000, Math.min(25000, (subject.lotSqft - c.lotSqft) * 6));
    if (Math.abs(lot) >= 500) adjustments.push({ label: "Lot", amount: Math.round(lot / 100) * 100 });

    const netAdjustment = adjustments.reduce((s, a) => s + a.amount, 0);
    const adjustedPrice = c.salePrice + netAdjustment;
    const similarity = 1 - Math.abs(c.sqft - subject.sqft) / subject.sqft;
    const weight = (1 / (0.3 + distanceMi)) * (1 / (1 + monthsAgo / 12)) * similarity;
    return {
      ...c,
      distanceMi,
      monthsAgo,
      pricePerSqft,
      adjustments,
      netAdjustment,
      adjustedPrice,
      adjustedPricePerSqft: adjustedPrice / subject.sqft,
      weight,
    };
  });
  adjusted.sort((a, b) => b.weight - a.weight);
  return { adjusted, neighborhoodPpsf };
}

export function computeTrend(neighborhoodPpsf: number): { trend: TrendPoint[]; trendPct: number } {
  const latest = TREND_FACTORS[TREND_FACTORS.length - 1];
  const trend = TREND_MONTHS.map((month, i) => ({ month, medianPpsf: Math.round((neighborhoodPpsf * TREND_FACTORS[i]) / latest) }));
  const trendPct = (latest / TREND_FACTORS[0] - 1) * 100;
  return { trend, trendPct };
}

export function indicatedValue(adjusted: AdjustedComp[]): number {
  const wsum = adjusted.reduce((s, c) => s + c.weight, 0);
  const v = adjusted.reduce((s, c) => s + c.adjustedPrice * c.weight, 0) / wsum;
  return Math.round(v / 1000) * 1000;
}

export function buildGrounds(subject: Subject, adjusted: AdjustedComp[], indicated: number, neighborhoodPpsf: number, trendPct: number): { grounds: string[]; recommendation: Recommendation } {
  const overPct = ((subject.assessedValue - indicated) / indicated) * 100;
  const assessedPpsf = subject.assessedValue / subject.sqft;
  const adjPpsf = median(adjusted.map((c) => c.adjustedPricePerSqft));
  const grounds: string[] = [];
  const fmt = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

  if (overPct >= 3) {
    grounds.push(`The assessed value of ${fmt(subject.assessedValue)} exceeds the true and fair value indicated by ${adjusted.length} adjusted comparable sales (${fmt(indicated)}) by ${fmt(subject.assessedValue - indicated)}, or ${overPct.toFixed(1)}%. RCW 84.40.030 requires assessment at one hundred percent of true and fair value.`);
  }
  if (assessedPpsf > adjPpsf * 1.02) {
    grounds.push(`The assessment implies ${fmt(assessedPpsf)} per square foot against an adjusted comparable median of ${fmt(adjPpsf)} per square foot for similar homes within ${Math.max(...adjusted.map((c) => c.distanceMi)).toFixed(1)} miles.`);
  }
  const medianYear = median(adjusted.map((c) => c.yearBuilt));
  if (subject.yearBuilt < medianYear - 3) {
    grounds.push(`The subject was built in ${subject.yearBuilt}, older than the comparable median of ${Math.round(medianYear)}. Even after crediting comparables for age, the sales support a value below the assessment.`);
  }
  if (overPct >= 3) {
    grounds.push(`All comparables were time-adjusted to current market conditions using a 12-month median trend of ${trendPct >= 0 ? "+" : ""}${trendPct.toFixed(1)}%. The over-assessment persists after that adjustment, so it is not explained by market movement.`);
  }
  if (overPct < 3 && overPct >= 0) {
    grounds.push(`Adjusted comparable sales indicate ${fmt(indicated)}, within ${overPct.toFixed(1)}% of the assessment. The evidence for a reduction is thin; recommend holding unless condition issues can be documented.`);
  }
  if (overPct < 0) {
    grounds.push(`Adjusted comparable sales indicate ${fmt(indicated)}, above the current assessment. An appeal is not recommended on these comparables.`);
  }
  const recommendation: Recommendation = overPct >= 6 ? "appeal" : overPct >= 3 ? "marginal" : "hold";
  return { grounds, recommendation };
}

export function analyzeSubject(subject: Subject): Analysis {
  const { comps, radius } = selectComps(subject);
  const { adjusted, neighborhoodPpsf } = adjustComps(subject, comps);
  const { trend, trendPct } = computeTrend(neighborhoodPpsf);
  const indicated = indicatedValue(adjusted);
  const { grounds, recommendation } = buildGrounds(subject, adjusted, indicated, neighborhoodPpsf, trendPct);
  return {
    subject,
    comps: adjusted,
    searchRadiusMi: radius,
    neighborhoodPpsf,
    trend,
    trendPct,
    indicatedValue: indicated,
    indicatedPpsf: indicated / subject.sqft,
    assessedPpsf: subject.assessedValue / subject.sqft,
    overAssessedBy: subject.assessedValue - indicated,
    overAssessedPct: ((subject.assessedValue - indicated) / indicated) * 100,
    recommendation,
    grounds,
    valuationDate: VALUATION_DATE,
    assessmentYear: ASSESSMENT_YEAR,
  };
}
