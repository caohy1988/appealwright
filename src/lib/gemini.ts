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

COMPARABLE SALES SUMMARY (for your reference; the firm's system appends the aligned comparable table and one evidence paragraph per sale to section 2 after you write it, so do not reproduce them):
${compTable(a)}

GROUNDS (restate each in your own words, one numbered paragraph each, keep every number):
${a.grounds.map((g, i) => `${i + 1}. ${g}`).join("\n")}

REQUIREMENTS:
- Sections: Re: block; salutation "Dear Members of the Board:"; opening paragraph stating assessed value, indicated value, and the request; 1. Subject property; 2. Comparable sales (one paragraph only: how many sales, radius, months, what was adjusted; then stop); 3. Indicated value; 4. Market trend; 5. Grounds; 6. Requested relief; closing. Keep the whole letter under 550 words.
- Do not write per-comparable paragraphs, do not list individual sale prices or adjustments, and do not mention any comparable's street address anywhere. The system inserts that evidence verbatim.
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

export type GenerateResult = { text: string; transport: Transport; project?: string; location?: string };

export const TIMEOUT_MS = 25_000;

export class TimeoutError extends Error {}

export type GenerateOptions = {
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  // Test seam. Production always obtains the token through buildAuth.
  getToken?: (signal: AbortSignal) => Promise<string>;
};

function raceAbort<T>(p: Promise<T>, signal: AbortSignal, onAbort: () => Error): Promise<T> {
  if (signal.aborted) return Promise.reject(onAbort());
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(onAbort());
    signal.addEventListener("abort", abort, { once: true });
    p.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
}

type StreamChunk = { candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[]; promptFeedback?: { blockReason?: string } };

// Streams the letter. The caller's signal is honoured through connect, body, and parse.
async function callGenerateContent(url: string, headers: Record<string, string>, body: unknown, signal: AbortSignal, fetchImpl: typeof fetch): Promise<string> {
  const res = await fetchImpl(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal });
  if (!res.ok) {
    const raw = await res.text();
    let msg = raw;
    try {
      msg = JSON.parse(raw)?.error?.message ?? raw;
    } catch {}
    throw new Error(`${MODEL_ID} returned HTTP ${res.status}: ${msg.slice(0, 400)}`);
  }
  if (!res.body) throw new Error(`${MODEL_ID} returned an empty stream`);

  let text = "";
  let finish: string | undefined;
  let blocked: string | undefined;
  let buffer = "";
  const consume = (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload) continue;
      let j: StreamChunk;
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
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  for (;;) {
    if (signal.aborted) throw new Error("aborted");
    const { done, value } = await reader.read();
    if (done) break;
    consume(decoder.decode(value, { stream: true }));
  }
  consume(decoder.decode());
  if (!text.trim()) throw new Error(`${MODEL_ID} returned no text (${blocked ?? finish ?? "empty response"})`);
  if (finish && finish !== "STOP") throw new Error(`${MODEL_ID} stopped early (${finish}); draft would be incomplete`);
  return text;
}

// One deadline for the whole call: credentials, connection, streaming, and parsing.
export async function generateLetter(a: Analysis, opts: GenerateOptions = {}): Promise<GenerateResult> {
  const timeoutMs = opts.timeoutMs ?? TIMEOUT_MS;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const project = process.env.GOOGLE_CLOUD_PROJECT || DEFAULT_PROJECT;
  const location = process.env.GOOGLE_CLOUD_LOCATION || DEFAULT_LOCATION;
  const where = `Vertex AI (project ${project}, location ${location})`;
  const { system, user } = buildPrompt(a);
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    // gemini-3.8-flash is a thinking model. Keep thinking low so the budget goes to the letter,
    // and leave headroom so a full petition never truncates.
    generationConfig: { temperature: 0.3, maxOutputTokens: 16384, thinkingConfig: { thinkingLevel: "low" } },
  };

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const timeout = () => new TimeoutError(`${where}: ${MODEL_ID} did not finish within ${timeoutMs / 1000}s. The deadline covers credentials, connection, streaming, and parsing.`);

  let transport: Transport = "vertex-adc";
  try {
    let token: string;
    if (opts.getToken) {
      token = await raceAbort(opts.getToken(ac.signal), ac.signal, timeout);
    } else {
      let auth: GoogleAuth;
      try {
        ({ auth, transport } = buildAuth());
      } catch (e) {
        throw new Error(`${where}: ${e instanceof Error ? e.message : String(e)}`);
      }
      try {
        const client = await raceAbort(auth.getClient(), ac.signal, timeout);
        const t = (await raceAbort(client.getAccessToken(), ac.signal, timeout)).token;
        if (!t) throw new Error(`credentials (${transport}) returned no access token.`);
        token = t;
      } catch (e) {
        if (e instanceof TimeoutError) throw e;
        throw new Error(`${where}: could not obtain credentials (${transport}). ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const host = location === "global" ? "aiplatform.googleapis.com" : `${location}-aiplatform.googleapis.com`;
    const url = `https://${host}/v1/projects/${project}/locations/${location}/publishers/google/models/${MODEL_ID}:streamGenerateContent?alt=sse`;
    try {
      const text = await callGenerateContent(url, { authorization: `Bearer ${token}` }, body, ac.signal, fetchImpl);
      return { text, transport, project, location };
    } catch (e) {
      if (ac.signal.aborted) throw timeout();
      throw new Error(`${where}: ${e instanceof Error ? e.message : String(e)}`);
    }
  } catch (e) {
    if (ac.signal.aborted && !(e instanceof TimeoutError)) throw timeout();
    throw e;
  } finally {
    clearTimeout(timer);
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
