import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SUBJECTS } from "../src/lib/seed";
import { analyzeSubject } from "../src/lib/agent";
import { TimeoutError, generateLetter } from "../src/lib/gemini";

const analysis = analyzeSubject(SUBJECTS[0]);
const src = readFileSync(new URL("../src/lib/gemini.ts", import.meta.url), "utf8");

test("gemini.ts has no AI Studio or API-key path", () => {
  assert.ok(!src.includes("GOOGLE_GENERATIVE_AI_API_KEY"));
  assert.ok(!src.includes("generativelanguage.googleapis.com"));
  assert.ok(!src.includes("x-goog-api-key"));
  assert.ok(src.includes("aiplatform.googleapis.com"));
});

function hangingFetch(calls: string[]): typeof fetch {
  return ((url: string | URL | Request, init?: RequestInit) =>
    new Promise<Response>((_, reject) => {
      calls.push(String(url));
      init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    })) as typeof fetch;
}

const sse = (obj: unknown) => new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`);

test("deadline covers token acquisition: a hung credential call throws TimeoutError", async () => {
  const calls: string[] = [];
  await assert.rejects(
    generateLetter(analysis, { timeoutMs: 40, getToken: () => new Promise(() => {}), fetchImpl: hangingFetch(calls) }),
    (e: unknown) => e instanceof TimeoutError && /project test-project-0728-467323, location global/.test((e as Error).message),
  );
  assert.equal(calls.length, 0, "fetch never reached");
});

test("deadline covers the model call: abort throws TimeoutError and no second provider is tried", async () => {
  const calls: string[] = [];
  await assert.rejects(
    generateLetter(analysis, { timeoutMs: 40, getToken: async () => "tok", fetchImpl: hangingFetch(calls) }),
    (e: unknown) => e instanceof TimeoutError && /did not finish within/.test((e as Error).message),
  );
  assert.equal(calls.length, 1, "exactly one provider call");
  assert.match(calls[0], /^https:\/\/aiplatform\.googleapis\.com\/v1\/projects\/test-project-0728-467323\/locations\/global\/publishers\/google\/models\/gemini-3\.8-flash:streamGenerateContent/);
});

test("deadline covers streaming and parse: a stalled body throws TimeoutError", async () => {
  const calls: string[] = [];
  const stalled: typeof fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push(String(url));
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(sse({ candidates: [{ content: { parts: [{ text: "Dear" }] } }] }));
        init?.signal?.addEventListener("abort", () => controller.error(new Error("aborted")));
      },
    });
    return new Response(body, { status: 200 });
  }) as typeof fetch;
  await assert.rejects(generateLetter(analysis, { timeoutMs: 60, getToken: async () => "tok", fetchImpl: stalled }), (e: unknown) => e instanceof TimeoutError);
  assert.equal(calls.length, 1);
});

test("a complete stream resolves with transport and location", async () => {
  const done: typeof fetch = (async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(sse({ candidates: [{ content: { parts: [{ text: "Hello " }] } }] }));
        controller.enqueue(sse({ candidates: [{ content: { parts: [{ text: "Board" }] }, finishReason: "STOP" }] }));
        controller.close();
      },
    });
    return new Response(body, { status: 200 });
  }) as typeof fetch;
  const r = await generateLetter(analysis, { timeoutMs: 1000, getToken: async () => "tok", fetchImpl: done });
  assert.equal(r.text, "Hello Board");
  assert.equal(r.project, "test-project-0728-467323");
  assert.equal(r.location, "global");
  assert.ok(r.transport === "vertex-adc" || r.transport === "vertex-sa");
});
