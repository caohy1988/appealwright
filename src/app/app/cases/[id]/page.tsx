"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentTimeline } from "@/components/AgentTimeline";
import { CompsTable } from "@/components/CompsTable";
import { LetterEditor } from "@/components/LetterEditor";
import { Sparkline } from "@/components/Sparkline";
import { Badge, Button, Card, SectionTitle, Stat } from "@/components/ui";
import { analyzeSubject, initialSteps } from "@/lib/agent";
import { baths, money, num, pct } from "@/lib/format";
import { composeLetter } from "@/lib/letter";
import { useStore } from "@/lib/store";
import type { AgentStep, Analysis, Draft, StepKey, StepStatus } from "@/lib/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type DraftMeta = { transport?: string; project?: string; location?: string; ms?: number; missing?: string[] };

export default function Workstation() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const subject = store.cases.find((c) => c.id === id);
  const analysis: Analysis | null = useMemo(() => (subject ? analyzeSubject(subject) : null), [subject]);
  const existing = store.drafts[id];

  const [steps, setSteps] = useState<AgentStep[]>(() => (existing ? initialSteps().map((s) => ({ ...s, status: "done" as StepStatus })) : initialSteps()));
  const [running, setRunning] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<DraftMeta>({});
  const [letter, setLetter] = useState(existing?.letter ?? "");
  const [model, setModel] = useState<Draft["letterModel"] | null>(existing?.letterModel ?? null);
  const started = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setStep = useCallback((key: StepKey, patch: Partial<AgentStep>) => {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }, []);

  const run = useCallback(
    async (useOffline: boolean) => {
      if (!subject || !analysis) return;
      setRunning(true);
      setError(null);
      setMeta({});
      setLetter("");
      setModel(null);
      setSteps(initialSteps());
      const a = analysis;

      const t0 = Date.now();
      setStep("locate", { status: "running" });
      await sleep(450);
      setStep("locate", {
        status: "done",
        ms: Date.now() - t0,
        detail: `${subject.address}, ${subject.city} · Parcel ${subject.parcel} · ${num(subject.sqft)} sf, ${subject.beds} bd / ${baths(subject.baths)} ba, built ${subject.yearBuilt}${subject.factsAssumed ? " (some facts assumed)" : ""}`,
      });

      const t1 = Date.now();
      setStep("comps", { status: "running" });
      await sleep(700);
      setStep("comps", {
        status: "done",
        ms: Date.now() - t1,
        detail: `${a.comps.length} sales within ${a.searchRadiusMi.toFixed(1)} mi, 12 months, ±35% living area. Neighborhood median ${money(a.neighborhoodPpsf)}/sf.`,
      });

      const t2 = Date.now();
      setStep("adjust", { status: "running" });
      await sleep(650);
      setStep("adjust", {
        status: "done",
        ms: Date.now() - t2,
        detail: `Time, living area, baths, age, lot. Weighted by proximity, recency, similarity. Indicated ${money(a.indicatedValue)} (${money(a.indicatedPpsf)}/sf).`,
      });

      const t3 = Date.now();
      setStep("trend", { status: "running" });
      await sleep(450);
      setStep("trend", { status: "done", ms: Date.now() - t3, detail: `12-month median $/sf ${pct(a.trendPct)}. Comparables time-adjusted before weighting.` });

      const t4 = Date.now();
      setStep("grounds", { status: "running" });
      await sleep(450);
      setStep("grounds", {
        status: "done",
        ms: Date.now() - t4,
        detail: `${a.grounds.length} grounds. Assessed ${money(subject.assessedValue)} is ${pct(a.overAssessedPct)} vs indicated. Recommendation: ${a.recommendation}.`,
      });

      const t5 = Date.now();
      if (useOffline) {
        setStep("letter", { status: "running", detail: "Offline preview: deterministic composer." });
        await sleep(500);
        const text = composeLetter(a);
        setLetter(text);
        setModel("deterministic");
        setStep("letter", { status: "done", ms: Date.now() - t5, detail: "Offline preview composed locally. Not a model draft." });
        store.saveDraft({ caseId: subject.id, letter: text, letterModel: "deterministic", generatedAt: new Date().toISOString() });
        if (subject.status === "new") store.setCaseStatus(subject.id, "drafted");
        setRunning(false);
        return;
      }

      setStep("letter", { status: "running", detail: "Calling gemini-3.8-flash on Vertex AI with the adjusted comparables as JSON." });
      try {
        const res = await fetch("/api/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analysis: a }) });
        const j = await res.json();
        if (!res.ok || !j.letter) throw new Error(j.error || `HTTP ${res.status}`);
        setLetter(j.letter);
        setModel("gemini-3.8-flash");
        setMeta({ transport: j.transport, project: j.project, location: j.location, ms: j.ms, missing: j.missing });
        const where = j.transport === "vertex-adc" ? `Vertex AI · ${j.project} / ${j.location}` : "Gemini API";
        setStep("letter", {
          status: "done",
          ms: Date.now() - t5,
          detail: `gemini-3.8-flash via ${where}.${j.missing?.length ? ` Check: letter omits ${j.missing.join(", ")}.` : " All comparables and figures cited."}`,
        });
        store.saveDraft({ caseId: subject.id, letter: j.letter, letterModel: "gemini-3.8-flash", generatedAt: new Date().toISOString() });
        if (subject.status === "new") store.setCaseStatus(subject.id, "drafted");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
        setStep("letter", { status: "error", ms: Date.now() - t5, detail: `Model call failed: ${msg}` });
      } finally {
        setRunning(false);
      }
    },
    [subject, analysis, setStep, store],
  );

  useEffect(() => {
    if (started.current || !subject || existing) return;
    const t = setTimeout(() => {
      if (started.current) return;
      started.current = true;
      void run(false);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject?.id]);

  function onEdit(v: string) {
    setLetter(v);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (subject && model) store.saveDraft({ caseId: subject.id, letter: v, letterModel: model, generatedAt: existing?.generatedAt ?? new Date().toISOString(), editedAt: new Date().toISOString() });
    }, 400);
  }

  if (!store.hydrated) return null;
  if (!subject || !analysis) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-semibold">Case not found</h1>
        <Button href="/app" variant="secondary" className="mt-4">
          Back to cases
        </Button>
      </div>
    );
  }

  const a = analysis;
  const over = a.overAssessedPct;
  const tone = over >= 6 ? "rust" : over >= 3 ? "neutral" : "moss";
  const modelLabel =
    model === "gemini-3.8-flash"
      ? `gemini-3.8-flash · ${meta.transport === "gemini-api-key" ? "Gemini API" : `Vertex AI${meta.project ? ` · ${meta.project} / ${meta.location}` : ""}`}`
      : model === "deterministic"
        ? "Offline preview · deterministic composer"
        : running
          ? "Drafting…"
          : "No draft";

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center text-xs text-ink-500">
            <a href="/app" className="inline-flex min-h-11 items-center pr-1 hover:underline">
              Cases
            </a>
            <span>/ {subject.parcel}</span>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{subject.address}</h1>
          <p className="text-sm text-ink-700">
            {subject.city}, WA {subject.zip} · {subject.beds} bd / {baths(subject.baths)} ba · {num(subject.sqft)} sf · {num(subject.lotSqft)} sf lot · built {subject.yearBuilt}
            {subject.factsAssumed ? <span className="ml-2 text-rust-700">Some facts assumed. Edit before filing.</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-stone-300 bg-white px-3 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-ink-950" checked={offline} onChange={(e) => setOffline(e.target.checked)} disabled={running} />
            Offline preview
          </label>
          <Button onClick={() => run(offline)} disabled={running}>
            {running ? "Drafting…" : letter ? "Redraft appeal" : "Draft appeal"}
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Assessed value" value={money(subject.assessedValue)} sub={`${money(a.assessedPpsf)} / sf · ${a.assessmentYear}`} />
        <Stat label="Indicated value" value={money(a.indicatedValue)} sub={`${money(a.indicatedPpsf)} / sf · ${a.comps.length} comps`} />
        <Stat label="Over-assessed" value={pct(over)} sub={`${money(a.overAssessedBy)} above indicated`} tone={tone} />
        <Stat label="12-mo trend" value={pct(a.trendPct)} sub="median $/sf, submarket" tone={a.trendPct >= 0 ? "moss" : "rust"} />
      </div>

      <Card className="mt-5">
        <SectionTitle right={<Badge tone={a.recommendation === "appeal" ? "rust" : a.recommendation === "marginal" ? "neutral" : "moss"}>{a.recommendation}</Badge>}>Agent timeline</SectionTitle>
        <AgentTimeline steps={steps} />
      </Card>

      <Card className="mt-5 overflow-hidden">
        <SectionTitle right={<span className="text-xs text-ink-500 tnum">{a.comps.length} sales · {a.searchRadiusMi.toFixed(1)} mi</span>}>Comparable sales</SectionTitle>
        <CompsTable comps={a.comps} />
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="flex flex-col gap-5">
          <Card>
            <SectionTitle>12-month median $/sf</SectionTitle>
            <div className="p-4">
              <Sparkline points={a.trend} />
              <div className="mt-2 flex justify-between text-xs text-ink-700 tnum">
                <span>{money(a.trend[0].medianPpsf)} / sf</span>
                <span className={a.trendPct >= 0 ? "text-moss-700" : "text-rust-700"}>{pct(a.trendPct)}</span>
                <span>{money(a.trend[a.trend.length - 1].medianPpsf)} / sf</span>
              </div>
              <p className="mt-2 text-[11px] text-ink-500">Synthetic submarket index anchored to the selected comparables.</p>
            </div>
          </Card>
          <Card>
            <SectionTitle>Grounds</SectionTitle>
            <ol className="divide-y divide-stone-200 text-sm">
              {a.grounds.map((g, i) => (
                <li key={i} className="flex gap-3 px-4 py-3 leading-relaxed">
                  <span className="text-ink-500 tnum">{i + 1}.</span>
                  <span>{g}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Card className="overflow-hidden">
            <SectionTitle
              right={
                <span className="flex items-center gap-2 text-xs text-ink-500">
                  <Badge tone={model === "gemini-3.8-flash" ? "ink" : "neutral"}>{model === "gemini-3.8-flash" ? "Model" : model === "deterministic" ? "Preview" : "Idle"}</Badge>
                  <span className="hidden sm:inline">{modelLabel}</span>
                </span>
              }
            >
              Appeal letter
            </SectionTitle>
            <div className="border-b border-stone-200 px-4 py-2 text-xs text-ink-500 sm:hidden">{modelLabel}</div>
            {error ? (
              <div className="border-b border-rust-100 bg-rust-100/60 px-4 py-3 text-sm text-rust-700">
                <div className="font-medium">The model call failed. No letter was substituted.</div>
                <div className="mt-1 break-words font-mono text-xs">{error}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => run(false)} disabled={running}>
                    Retry with gemini-3.8-flash
                  </Button>
                  <Button variant="ghost" onClick={() => run(true)} disabled={running}>
                    Use offline preview instead
                  </Button>
                </div>
              </div>
            ) : null}
            {meta.missing?.length ? (
              <div className="border-b border-stone-200 bg-stone-100 px-4 py-2 text-xs text-ink-700">Review: the model draft omits {meta.missing.join(", ")}.</div>
            ) : null}
            {running && !letter ? (
              <div className="px-4 py-10 text-center text-sm text-ink-500">{steps.find((s) => s.status === "running")?.title ?? "Working"}…</div>
            ) : (
              <LetterEditor value={letter} onChange={onEdit} disabled={running} />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
