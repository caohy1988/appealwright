import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { SUBJECTS } from "../src/lib/seed";
import { MIN_COMPS, analyzeSubject, inputHash, isDraftStale } from "../src/lib/agent";

const subject = SUBJECTS[0];

test("drafts without an inputHash are stale", () => {
  const a = analyzeSubject(subject);
  const h = inputHash(a);
  assert.equal(isDraftStale({ inputHash: undefined }, h), true);
  assert.equal(isDraftStale({}, h), true);
  assert.equal(isDraftStale({ inputHash: h }, h), false);
  assert.equal(isDraftStale({ inputHash: "deadbeef" }, h), true);
  assert.equal(isDraftStale(undefined, h), false);
});

test("hash changes when a comp is excluded and when subject facts change", () => {
  const base = analyzeSubject(subject);
  const excluded = analyzeSubject(subject, [base.comps[0].id]);
  assert.equal(excluded.comps.length, base.comps.length - 1);
  assert.equal(excluded.excluded.length, 1);
  assert.notEqual(inputHash(excluded), inputHash(base));
  const changed = analyzeSubject({ ...subject, assessedValue: subject.assessedValue + 1000 });
  assert.notEqual(inputHash(changed), inputHash(base));
  assert.equal(inputHash(analyzeSubject(subject)), inputHash(base), "hash is deterministic");
});

test("excluding below MIN_COMPS falls back to all comps and warns", () => {
  const base = analyzeSubject(subject);
  const warn = mock.method(console, "warn", () => {});
  try {
    const tooMany = analyzeSubject(subject, base.comps.slice(0, base.comps.length - MIN_COMPS + 1).map((c) => c.id));
    assert.equal(tooMany.comps.length, base.comps.length);
    assert.equal(tooMany.excluded.length, 0);
    assert.equal(warn.mock.callCount(), 1);
    assert.match(String(warn.mock.calls[0].arguments[0]), /below the minimum/);
  } finally {
    warn.mock.restore();
  }
});

test("excluding down to exactly MIN_COMPS does not warn", () => {
  const base = analyzeSubject(subject);
  const warn = mock.method(console, "warn", () => {});
  try {
    const a = analyzeSubject(subject, base.comps.slice(0, base.comps.length - MIN_COMPS).map((c) => c.id));
    assert.equal(a.comps.length, MIN_COMPS);
    assert.equal(warn.mock.callCount(), 0);
  } finally {
    warn.mock.restore();
  }
});
