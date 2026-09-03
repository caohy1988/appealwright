"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentTimeline } from "@/components/AgentTimeline";
import { CompsTable } from "@/components/CompsTable";
import { LetterEditor } from "@/components/LetterEditor";
import { Sparkline } from "@/components/Sparkline";
import { Badge, Button, Card, SectionTitle, Stat } from "@/components/ui";
import { MIN_COMPS, analyzeSubject, initialSteps, inputHash, isDraftStale } from "@/lib/agent";
import { baths, money, num, pct } from "@/lib/format";
import { composeLetter } from "@/lib/letter";
import { useStore } from "@/lib/store";
import type { AgentStep, Analysis, Draft, StepKey, StepStatus } from "@/lib/types";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const CLIENT_TIMEOUT_MS = 90_000; // the server enforces its own 25s deadline; this only guards a dead connection
const DEFAULT_PROJECT = "test-project-0728-467323";
const DEFAULT_LOCATION = "global";

type DraftMeta = { transport?: string; project?: string; location?: string; ms?: number };
type DraftError = { kind: "ungrounded" | "timeout" | "transport"; message: string };

export default function Workstation() {
  const { id } = useParams<{ id: string }>();
  const store = useStore();
  const subject = store.cases.find((c) => c.id === id);
  const exclusions = useMemo(() => store.exclusions[id] ?? [], [store.exclusions, id]);
  const analysis: Analysis | null = useMemo(() => (subject ? analyzeSubject(subject, exclusions) : null), [subject, exclusions]);
  const existing = store.drafts[id];
  const currentHash = analysis ? inputHash(analysis) : "";
  const stale = Boolean(existing?.letter) && isDraftStale(existing, currentHash);

  const [steps, setSteps] = useState<AgentStep[]>(() => (existing ? initialSteps().map((s) => ({ ...s, status: "done" as StepStatus })) : initialSteps()));
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<DraftError | null>(null);
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
        store.saveDraft({ caseId: subject.id, letter: text, letterModel: "deterministic", generatedAt: new Date().toISOString(), inputHash: inputHash(a) });
        if (subject.status === "new") store.setCaseStatus(subject.id, "drafted");
        setRunning(false);
        return;
      }

      setStep("letter", { status: "running", detail: "Vertex AI · gemini-3.8-flash. Drafting from the selected comparables." });
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), CLIENT_TIMEOUT_MS);
      try {
        let res: Response;
        try {
          // Excluded comparables are not in a.comps, so they never reach the model.
          res = await fetch("/api/draft", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ analysis: a }), signal: ac.signal });
        } catch (e) {
          if (ac.signal.aborted) throw { kind: "timeout", message: `No response from the server after ${CLIENT_TIMEOUT_MS / 1000}s.` } satisfies DraftError;
          throw { kind: "transport", message: e instanceof Error ? e.message : String(e) } satisfies DraftError;
        }
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.letter) {
          const kind: DraftError["kind"] = res.status === 422 || j.kind === "ungrounded" ? "ungrounded" : res.status === 504 || j.kind === "timeout" ? "timeout" : "transport";
          throw { kind, message: j.error || `HTTP ${res.status}` } satisfies DraftError;
        }
        setLetter(j.letter);
        setModel("gemini-3.8-flash");
        setMeta({ transport: j.transport, project: j.project, location: j.location, ms: j.ms });
        setStep("letter", {
          status: "done",
          ms: Date.now() - t5,
          detail: `Vertex AI · gemini-3.8-flash · ${j.project ?? DEFAULT_PROJECT} / ${j.location ?? DEFAULT_LOCATION}. Every comparable checked against the letter.`,
        });
        store.saveDraft({ caseId: subject.id, letter: j.letter, letterModel: "gemini-3.8-flash", generatedAt: new Date().toISOString(), inputHash: inputHash(a) });
        if (subject.status === "new") store.setCaseStatus(subject.id, "drafted");
      } catch (e) {
        // Nothing is saved on failure. The previous draft, if any, stays untouched in the store.
        const err: DraftError = e && typeof e === "object" && "kind" in e ? (e as DraftError) : { kind: "transport", message: e instanceof Error ? e.message : String(e) };
        setError(err);
        setStep("letter", { status: "error", ms: Date.now() - t5, detail: err.kind === "ungrounded" ? "Draft rejected: not grounded on the selected sales." : "Model call failed." });
      } finally {
        clearTimeout(timer);
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
      if (subject && model) store.saveDraft({ caseId: subject.id, letter: v, letterModel: model, generatedAt: existing?.generatedAt ?? new Date().toISOString(), editedAt: new Date().toISOString(), inputHash: existing?.inputHash });
    }, 400);
  }

  function toggleComp(compId: string, include: boolean) {
    if (!subject) return;
    const next = include ? exclusions.filter((x) => x !== compId) : [...exclusions, compId];
    store.setExclusions(subject.id, next);
  }

  if (!store.hydrated) return null;
  if (!subject || !analysis) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-xl font-semibold">Case not found</h1>
        <p className="mt-1 text-sm text-ink-700">It may have been created in another browser. Cases live in this browser only.</p>
        <Button href="/app" variant="secondary" className="mt-4">
          Back to cases
        </Button>
      </div>
    );
  }

  const a = analysis;
  const over = a.overAssessedPct;
  const tone = over >= 6 ? "rust" : over >= 3 ? "neutral" : "moss";
  const primaryLabel = running ? "Drafting…" : letter ? "Redraft appeal" : "Draft appeal";
  const modelLabel =
    model === "gemini-3.8-flash"
      ? `Vertex AI · gemini-3.8-flash · ${meta.project ?? DEFAULT_PROJECT} / ${meta.location ?? DEFAULT_LOCATION}`
      : model === "deterministic"
        ? "Offline preview · deterministic composer, not a model draft"
        : running
          ? "Vertex AI · gemini-3.8-flash · drafting"
          : "Vertex AI · gemini-3.8-flash";
  const redraft = () => run(model === "deterministic");

  return (
    <div className="mx-auto max-w-7xl pb-24 md:pb-0">
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
        <div className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" onClick={() => run(true)} disabled={running} className="text-ink-500">
            Offline preview
          </Button>
          <Button onClick={() => run(false)} disabled={running}>
            {primaryLabel}
          </Button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Assessed value" value={money(subject.assessedValue)} sub={`${money(a.assessedPpsf)} / sf · ${a.assessmentYear}`} />
        <Stat label="Indicated value" value={money(a.indicatedValue)} sub={`${money(a.indicatedPpsf)} / sf · ${a.comps.length} comps`} />
        <Stat label="Over-assessed" value={pct(over)} sub={`${money(a.overAssessedBy)} above indicated`} tone={tone} />
        <Stat label="12-mo trend" value={pct(a.trendPct)} sub="median $/sf, submarket" tone={a.trendPct >= 0 ? "moss" : "rust"} />
      </div>

      <Card className="mt-4">
        <SectionTitle right={<Badge tone={a.recommendation === "appeal" ? "rust" : a.recommendation === "marginal" ? "neutral" : "moss"}>{a.recommendation}</Badge>}>Agent timeline</SectionTitle>
        <AgentTimeline steps={steps} />
      </Card>

      <Card className="mt-4 overflow-hidden">
        <SectionTitle right={<span className="text-xs text-ink-500 tnum">{a.comps.length} sales · {a.searchRadiusMi.toFixed(1)} mi</span>}>Comparable sales</SectionTitle>
        <CompsTable comps={a.comps} excluded={a.excluded} onToggle={toggleComp} disabled={running} minComps={MIN_COMPS} />
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
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

        <div className="flex min-w-0 flex-col gap-4">
          <Card className="overflow-hidden">
            <SectionTitle right={<Badge tone={model === "gemini-3.8-flash" ? "ink" : model === "deterministic" ? "neutral" : running ? "moss" : "neutral"}>{model === "gemini-3.8-flash" ? "Model draft" : model === "deterministic" ? "Preview" : running ? "Drafting" : "No draft"}</Badge>}>
              Appeal letter
            </SectionTitle>
            <div className="border-b border-stone-200 bg-stone-50 px-4 py-2 text-xs text-ink-700">{modelLabel}</div>

            {stale && !running ? (
              <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 bg-stone-100 px-4 py-2 text-xs text-ink-700">
                <span>Comparables or subject facts changed since this draft. It no longer matches the indication above.</span>
                <Button variant="secondary" onClick={redraft} className="ml-auto">
                  Redraft
                </Button>
              </div>
            ) : null}

            {error ? (
              <div className="border-b border-stone-200 bg-rust-100/50 px-4 py-3 text-sm">
                <div className="font-medium text-rust-700">{error.kind === "ungrounded" ? "Draft wasn't grounded on the selected sales" : error.kind === "timeout" ? "Vertex AI took too long" : "Couldn't draft this letter"}</div>
                <p className="mt-0.5 text-xs text-ink-700">
                  {error.kind === "ungrounded"
                    ? "The model left out or changed a figure, so the draft was rejected instead of saved. Try again; nothing was kept."
                    : "Nothing was saved and no letter was substituted. You can try again or open an offline preview."}
                </p>
                <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded border border-stone-200 bg-white px-2 py-1.5 font-mono text-[11px] text-ink-700">{error.message}</pre>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => run(false)} disabled={running}>
                    Try again
                  </Button>
                  <Button variant="ghost" onClick={() => run(true)} disabled={running} className="text-ink-500">
                    Offline preview instead
                  </Button>
                </div>
              </div>
            ) : null}

            {running && !letter ? (
              <div className="px-4 py-10 text-center text-sm text-ink-500">{steps.find((s) => s.status === "running")?.title ?? "Working"}…</div>
            ) : !letter && !error ? (
              <div className="px-4 py-10 text-center text-sm text-ink-500">
                <div className="font-medium text-ink-700">No letter yet.</div>
                <div className="mt-1">Draft appeal runs the agent and asks Vertex AI for the letter.</div>
              </div>
            ) : letter ? (
              <LetterEditor value={letter} onChange={onEdit} disabled={running} />
            ) : null}
          </Card>
        </div>
      </div>

      {/* Mobile action bar: the primary action stays under the thumb. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-stone-50/95 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <div className="flex items-center gap-2">
          <Button onClick={() => run(false)} disabled={running} size="lg" className="flex-1">
            {primaryLabel}
          </Button>
          <button type="button" onClick={() => run(true)} disabled={running} className="min-h-12 shrink-0 px-2 text-xs text-ink-500 underline-offset-2 hover:underline disabled:opacity-50">
            Offline preview
          </button>
        </div>
      </div>
    </div>
  );
}
