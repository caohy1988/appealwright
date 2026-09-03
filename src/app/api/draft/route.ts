import { NextResponse } from "next/server";
import { MODEL_ID, TimeoutError, generateLetter } from "@/lib/gemini";
import { injectEvidence, validateLetter } from "@/lib/letter";
import type { Analysis } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({
    model: MODEL_ID,
    project: process.env.GOOGLE_CLOUD_PROJECT || "test-project-0728-467323",
    location: process.env.GOOGLE_CLOUD_LOCATION || "global",
    transport: "vertex-ai",
  });
}

export async function POST(req: Request) {
  let analysis: Analysis;
  try {
    const body = await req.json();
    analysis = body?.analysis;
    if (!analysis?.subject?.parcel || !Array.isArray(analysis?.comps) || analysis.comps.length === 0) {
      return NextResponse.json({ error: "analysis with subject and comps is required" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const started = Date.now();
  try {
    const result = await generateLetter(analysis);
    // The evidence table is written by the server, never by the model.
    const letter = injectEvidence(result.text, analysis);
    const missing = validateLetter(letter, analysis);
    if (missing.length > 0) {
      return NextResponse.json(
        {
          kind: "ungrounded",
          error: `${MODEL_ID} draft rejected: not grounded on the selected comparables. ${missing.slice(0, 6).join(". ")}${missing.length > 6 ? ` (+${missing.length - 6} more)` : ""}`,
          model: MODEL_ID,
          transport: result.transport,
          missing,
          ms: Date.now() - started,
        },
        { status: 422 },
      );
    }
    return NextResponse.json({
      letter,
      model: MODEL_ID,
      transport: result.transport,
      project: result.project,
      location: result.location,
      ms: Date.now() - started,
      injected: letter !== result.text,
    });
  } catch (e) {
    const project = process.env.GOOGLE_CLOUD_PROJECT || "test-project-0728-467323";
    const location = process.env.GOOGLE_CLOUD_LOCATION || "global";
    let message = e instanceof Error ? e.message : String(e);
    if (!message.includes(`project ${project}`) || !message.includes(`location ${location}`)) {
      message = `Vertex AI (project ${project}, location ${location}): ${message}`;
    }
    const kind = e instanceof TimeoutError ? "timeout" : "transport";
    return NextResponse.json({ kind, error: message, model: MODEL_ID, project, location, ms: Date.now() - started }, { status: kind === "timeout" ? 504 : 502 });
  }
}
