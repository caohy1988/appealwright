import "server-only";
import { GoogleAuth } from "google-auth-library";
import type { Analysis } from "./types";
import { ANALYST, ORG_ADDRESS, ORG_NAME, TODAY } from "./seed";
import { BOE_ADDRESS, LEGAL_FOOTER, compTable } from "./letter";
import { dateLong, money } from "./format";

export const MODEL_ID = "gemini-3.8-flash";
// Vertex AI only. There is no AI Studio / API-key path.
export type Transport = "vertex-adc" | "vertex-sa";

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
- Sections: Re: block; salutation "Dear Members of the Board:"; opening paragraph stating assessed value, indicated value, and the request; 1. Subject property; 2. Comparable sales (table verbatim, then one compact paragraph of two or three sentences per comparable); 3. Indicated value; 4. Market trend; 5. Grounds; 6. Requested relief; closing. Keep the whole letter under 900 words.
- Each comparable paragraph must state, using the exact figures from the JSON: street address, sale date written out (for example ${dateLong(a.comps[0].saleDate)}), sale price, living area in square feet with thousands separators, price per square foot, every adjustment by name and signed dollar amount (for example "time +$19,500, living area −$28,000, baths +$3,100"), the net adjustment, and the adjusted price. Do not omit or round any of these figures.
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

// Streams from Vertex so a long letter cannot trip a total-time cap. The 25s
// AbortController fires only if no bytes arrive for 25s (connect, first token, or mid-stream).
async function callGenerateContent(url: string, headers: Record<string, string>, body: unknown): Promise<string> {
  const ac = new AbortController();
  let timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  const bump = () => {
    clearTimeout(timer);
    timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  };
  const timeout = () => new TimeoutError(`${MODEL_ID} produced no output for ${TIMEOUT_MS / 1000}s and was aborted`);
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: ac.signal });
  } catch (e) {
    clearTimeout(timer);
    if (ac.signal.aborted) throw timeout();
    throw e;
  }
  if (!res.ok) {
    clearTimeout(timer);
    const raw = await res.text();
    let msg = raw;
    try {
      msg = JSON.parse(raw)?.error?.message ?? raw;
    } catch {}
    throw new Error(`${MODEL_ID} returned HTTP ${res.status}: ${msg.slice(0, 400)}`);
  }
  if (!res.body) {
    clearTimeout(timer);
    throw new Error(`${MODEL_ID} returned an empty stream`);
  }

  let text = "";
  let finish: string | undefined;
  let blocked: string | undefined;
  let buffer = "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const consume = (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      let j: { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string } };
      try {
        j = JSON.parse(payload);
      } catch {
        continue;
      }
      const cand = j.candidates?.[0];
      for (const p of cand?.content?.parts ?? []) text += p.text ?? "";
      if (cand?.finishReason) finish = cand.finishReason;
      if (j.promptFeedback?.blockReason) blocked = j.promptFeedback.blockReason;
    }
  };
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bump();
      consume(decoder.decode(value, { stream: true }));
    }
    consume(decoder.decode());
  } catch (e) {
    if (ac.signal.aborted) throw timeout();
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!text.trim()) throw new Error(`${MODEL_ID} returned no text (${blocked ?? finish ?? "empty response"})`);
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
  const where = `Vertex AI (project ${project}, location ${location})`;

  let auth: GoogleAuth;
  let transport: Transport;
  try {
    ({ auth, transport } = buildAuth());
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`${where}: ${msg}`);
  }
  let token: string | null | undefined;
  try {
    const client = await auth.getClient();
    token = (await client.getAccessToken()).token;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`${where}: could not obtain credentials (${transport}). ${msg}`);
  }
  if (!token) throw new Error(`${where}: credentials (${transport}) returned no access token.`);

  const host = location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;
  const url = `https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${MODEL_ID}:streamGenerateContent?alt=sse`;
  try {
    const text = await callGenerateContent(url, { authorization: `Bearer ${token}` }, body);
    return { text, transport, project, location };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`${where}: ${msg}`);
  }
}

type ServiceAccount = { client_email: string; private_key: string };

// Credential order: explicit service-account env vars, then inline JSON in
// GOOGLE_APPLICATION_CREDENTIALS, then Application Default Credentials (local gcloud).
function buildAuth(): { auth: GoogleAuth; transport: Transport } {
  const scopes = ["https://www.googleapis.com/auth/cloud-platform"];
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  if (email && key) {
    return { auth: new GoogleAuth({ credentials: { client_email: email, private_key: key.replace(/\\n/g, "\n") }, scopes }), transport: "vertex-sa" };
  }
  const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (gac && gac.startsWith("{")) {
    let sa: ServiceAccount;
    try {
      sa = JSON.parse(gac) as ServiceAccount;
    } catch {
      throw new Error("GOOGLE_APPLICATION_CREDENTIALS is not valid JSON.");
    }
    if (!sa.client_email || !sa.private_key) throw new Error("GOOGLE_APPLICATION_CREDENTIALS JSON lacks client_email or private_key.");
    return { auth: new GoogleAuth({ credentials: { client_email: sa.client_email, private_key: sa.private_key.replace(/\\n/g, "\n") }, scopes }), transport: "vertex-sa" };
  }
  return { auth: new GoogleAuth({ scopes }), transport: "vertex-adc" };
}
