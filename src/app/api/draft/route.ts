import { NextResponse } from "next/server";
import { MODEL_ID, generateLetter } from "@/lib/gemini";
import { validateLetter } from "@/lib/letter";
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
    const missing = validateLetter(result.text, analysis);
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: `${MODEL_ID} draft rejected: not grounded on the selected comparables. Missing ${missing.length} item${missing.length === 1 ? "" : "s"}: ${missing.slice(0, 8).join("; ")}${missing.length > 8 ? "; …" : ""}`,
          model: MODEL_ID,
          transport: result.transport,
          missing,
          ms: Date.now() - started,
        },
        { status: 422 },
      );
    }
    return NextResponse.json({
      letter: result.text,
      model: MODEL_ID,
      transport: result.transport,
      project: result.project,
      location: result.location,
      ms: Date.now() - started,
      missing,
    });
  } catch (e) {
    const project = process.env.GOOGLE_CLOUD_PROJECT || "test-project-0728-467323";
    const location = process.env.GOOGLE_CLOUD_LOCATION || "global";
    let message = e instanceof Error ? e.message : String(e);
    if (!message.includes(`project ${project}`) || !message.includes(`location ${location}`)) {
      message = `Vertex AI (project ${project}, location ${location}): ${message}`;
    }
    return NextResponse.json({ error: message, model: MODEL_ID, project, location, ms: Date.now() - started }, { status: 502 });
  }
}
