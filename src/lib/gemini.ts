import "server-only";
import { GoogleAuth } from "google-auth-library";
import type { Analysis } from "./types";
import { ANALYST, ORG_ADDRESS, ORG_NAME, TODAY } from "./seed";
import { BOE_ADDRESS, LEGAL_FOOTER, compTable } from "./letter";
import { dateLong, money } from "./format";

export const MODEL_ID = "gemini-3.8-flash";
export type Transport = "vertex-adc" | "gemini-api-key";

const DEFAULT_PROJECT = "test-project-0728-467323";
const DEFAULT_LOCATION = "global";

export function buildPrompt(a: Analysis): { system: string; user: string } {
  const s = a.subject;
  const compsJson = a.comps.map((c, i) => ({
    n: i + 1,
    address: `${c.address}, ${c.city}, WA ${c.zip}`,
    saleDate: c.saleDate,
    salePrice: c.salePrice,
    sqft: c.sqft,
    pricePerSqft: Math.round(c.pricePerSqft),
    beds: c.beds,
    baths: c.baths,
    yearBuilt: c.yearBuilt,
    lotSqft: c.lotSqft,
    distanceMi: Number(c.distanceMi.toFixed(2)),
    adjustments: c.adjustments,
    netAdjustment: c.netAdjustment,
    adjustedPrice: c.adjustedPrice,
  }));

  const system = `You are a senior property-tax analyst at ${ORG_NAME}, a firm in Kirkland, Washington that represents homeowners before the King County Board of Equalization. You write formal, precise petition cover letters. You never invent facts, sales, or statutes. You use only the data provided. You cite RCW 84.40.030 (assessment at one hundred percent of true and fair value) once, plainly, without overclaiming. Tone: measured, professional, board-ready. No markdown, no bullet symbols, no bold. Plain text with numbered sections and blank lines between paragraphs. Currency as $1,234,567.`;

  const user = `Write the complete petition cover letter. Use exactly these facts.

LETTERHEAD (verbatim):
${ORG_NAME}
${ORG_ADDRESS.join("\n")}

DATE: ${dateLong(TODAY)}

ADDRESSEE (verbatim):
${BOE_ADDRESS.join("\n")}

SUBJECT PROPERTY:
Parcel No. ${s.parcel}
${s.address}, ${s.city}, WA ${s.zip}
${s.beds} bed, ${s.baths} bath, ${s.sqft} sq ft living area, ${s.lotSqft} sq ft lot, built ${s.yearBuilt}
Assessment year ${a.assessmentYear}, valuation date ${dateLong(a.valuationDate)}
Assessed value: ${money(s.assessedValue)} (${money(a.assessedPpsf)} per sq ft)

ANALYSIS:
Comparable search radius: ${a.searchRadiusMi} miles, sales within 12 months, similar living area.
Neighborhood unadjusted median: ${money(a.neighborhoodPpsf)} per sq ft.
Twelve-month median trend: ${a.trendPct >= 0 ? "+" : ""}${a.trendPct.toFixed(1)}%. Comparables were time-adjusted before weighting.
Weighting: proximity, recency, similarity in living area.
Indicated value: ${money(a.indicatedValue)} (${money(a.indicatedPpsf)} per sq ft).
Requested assessed value: ${money(a.indicatedValue)}.
Difference: ${money(a.overAssessedBy)} (${a.overAssessedPct.toFixed(1)}% above indicated).
Recommendation: ${a.recommendation}.

COMPARABLE SALES (JSON, adjustments are relative to the subject, negative means the comp is superior):
${JSON.stringify(compsJson, null, 2)}

COMPARABLE TABLE (include this block verbatim as section 2, keep the alignment):
${compTable(a)}

GROUNDS (restate each in your own words, one numbered paragraph each, keep every number):
${a.grounds.map((g, i) => `${i + 1}. ${g}`).join("\n")}

REQUIREMENTS:
- Sections: Re: block; salutation "Dear Members of the Board:"; opening paragraph stating assessed value, indicated value, and the request; 1. Subject property; 2. Comparable sales (table verbatim, then one short paragraph per comparable citing its street address, sale date, sale price, price per square foot, and adjusted price); 3. Indicated value; 4. Market trend; 5. Grounds; 6. Requested relief; closing.
- Every comparable street address must appear in the letter.
- The parcel number, assessed value ${money(s.assessedValue)}, and requested value ${money(a.indicatedValue)} must appear exactly.
- If the recommendation is "hold" or "marginal", still write the letter but say candidly in section 6 that the evidence is limited and the firm recommends review before filing.
- Sign as:
${ANALYST.name}
${ANALYST.title}, ${ORG_NAME}
Authorized agent for taxpayer
- End with a line containing an em dash and then exactly this footer:
${LEGAL_FOOTER}
- Output only the letter text.`;

  return { system, user };
}

type GenerateResult = { text: string; transport: Transport; project?: string; location?: string };

export const TIMEOUT_MS = 25_000;

export class TimeoutError extends Error {}

async function callGenerateContent(url: string, headers: Record<string, string>, body: unknown): Promise<string> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: ac.signal });
  } catch (e) {
    if (ac.signal.aborted) throw new TimeoutError(`${MODEL_ID} timed out after ${TIMEOUT_MS / 1000}s`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
  const raw = await res.text();
  if (!res.ok) {
    let msg = raw;
    try {
      const j = JSON.parse(raw);
      msg = j?.error?.message ?? raw;
    } catch {}
    throw new Error(`${MODEL_ID} returned HTTP ${res.status}: ${msg.slice(0, 400)}`);
  }
  const j = JSON.parse(raw);
  const cand = j?.candidates?.[0];
  const parts = cand?.content?.parts ?? [];
  const text = parts.map((p: { text?: string }) => p.text ?? "").join("");
  const finish = cand?.finishReason ?? j?.promptFeedback?.blockReason ?? "empty response";
  if (!text.trim()) throw new Error(`${MODEL_ID} returned no text (${finish})`);
  if (finish && finish !== "STOP") throw new Error(`${MODEL_ID} stopped early (${finish}); draft would be incomplete`);
  return text;
}

export async function generateLetter(a: Analysis): Promise<GenerateResult> {
  const { system, user } = buildPrompt(a);
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    // gemini-3.8-flash is a thinking model. Keep thinking low so the budget goes to the letter,
    // and leave headroom so a full petition never truncates.
    generationConfig: { temperature: 0.3, maxOutputTokens: 16384, thinkingConfig: { thinkingLevel: "low" } },
  };

  const project = process.env.GOOGLE_CLOUD_PROJECT || DEFAULT_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION || DEFAULT_LOCATION;
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  // Primary: Vertex AI with Application Default Credentials.
  let adcError: string | null = null;
  try {
    const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    if (!token.token) throw new Error("ADC returned no access token");
    const host = location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;
    const url = `https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${MODEL_ID}:generateContent`;
    const text = await callGenerateContent(url, { authorization: `Bearer ${token.token}` }, body);
    return { text, transport: "vertex-adc", project, location };
  } catch (e) {
    if (e instanceof TimeoutError) throw e; // do not spend another timeout on the fallback
    adcError = e instanceof Error ? e.message : String(e);
    // Fall through to the API key when credentials could not be obtained or the
    // Vertex call itself failed. The caller sees the real error if the key path also fails.
  }

  if (apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent`;
    const text = await callGenerateContent(url, { "x-goog-api-key": apiKey }, body);
    return { text, transport: "gemini-api-key" };
  }

  throw new Error(`Vertex AI (${project}/${location}) failed: ${adcError}. No GOOGLE_GENERATIVE_AI_API_KEY fallback configured.`);
}
