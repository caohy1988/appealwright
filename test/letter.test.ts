import { test } from "node:test";
import assert from "node:assert/strict";
import { SUBJECTS } from "../src/lib/seed";
import { analyzeSubject } from "../src/lib/agent";
import { compTable, composeLetter, injectEvidence, validateLetter } from "../src/lib/letter";
import { money, moneySigned } from "../src/lib/format";

const juanita = analyzeSubject(SUBJECTS[0]);
const MINUS = "−";

test("composer letter of every seeded subject passes validateLetter", () => {
  for (const s of SUBJECTS) {
    const a = analyzeSubject(s);
    assert.deepEqual(validateLetter(composeLetter(a), a), [], s.id);
  }
});

test("swapping two comps' sale prices everywhere is rejected and names both comps", () => {
  const [c1, c2] = juanita.comps;
  const p1 = money(c1.salePrice);
  const p2 = money(c2.salePrice);
  assert.notEqual(p1, p2);
  const swapped = composeLetter(juanita).split(p1).join("__SWAP__").split(p2).join(p1).split("__SWAP__").join(p2);
  const missing = validateLetter(swapped, juanita);
  assert.ok(missing.length > 0, "swapped letter must fail");
  assert.ok(missing.some((m) => m.includes(c1.address)), `mentions ${c1.address}: ${missing}`);
  assert.ok(missing.some((m) => m.includes(c2.address)), `mentions ${c2.address}: ${missing}`);
});

test("flipping every negative adjustment sign to positive is rejected", () => {
  const letter = composeLetter(juanita);
  const negatives = juanita.comps.flatMap((c) => c.adjustments.filter((x) => x.amount < 0));
  assert.ok(negatives.length > 0, "seed has negative adjustments");
  const flipped = letter.split(`${MINUS}$`).join("+$");
  assert.notEqual(flipped, letter);
  const missing = validateLetter(flipped, juanita);
  assert.ok(missing.length > 0, "flipped signs must fail");
  const neg = negatives[0];
  assert.ok(missing.some((m) => m.includes(moneySigned(neg.amount))), `mentions ${moneySigned(neg.amount)}: ${missing}`);
});

test("ASCII minus is accepted in place of unicode minus", () => {
  const ascii = composeLetter(juanita).split(MINUS).join("-");
  assert.deepEqual(validateLetter(ascii, juanita), []);
});

test("a whole-document bag of tokens does not satisfy per-comp association", () => {
  const oneBlock = composeLetter(juanita).replace(/\n/g, " ");
  const missing = validateLetter(oneBlock, juanita);
  assert.ok(missing.length > 0);
});

test("injectEvidence is idempotent on a correct letter and restores a missing or altered table", () => {
  const letter = composeLetter(juanita);
  assert.equal(injectEvidence(letter, juanita), letter);

  const table = compTable(juanita);
  const without = letter.replace(table + "\n\n", "");
  assert.ok(!without.includes(table));
  const injected = injectEvidence(without, juanita);
  assert.ok(injected.includes(table), "table inserted");
  assert.equal(injectEvidence(injected, juanita), injected, "second pass is a no-op");
  assert.deepEqual(validateLetter(injected, juanita), []);

  const altered = letter.replace(table, table.replace(money(juanita.comps[0].salePrice), "$999,999"));
  assert.notEqual(altered, letter);
  const repaired = injectEvidence(altered, juanita);
  assert.ok(repaired.includes(table), "altered table replaced");
  assert.equal((repaired.match(/# {2}Address/g) ?? []).length, 1, "exactly one table");
});

test("document-wide facts are still required", () => {
  const letter = composeLetter(juanita).replace(/84\.40\.030/g, "84.40.000");
  assert.ok(validateLetter(letter, juanita).includes("RCW 84.40.030"));
  const noParcel = composeLetter(juanita).split(juanita.subject.parcel).join("000000-0000");
  assert.ok(validateLetter(noParcel, juanita).includes("parcel number"));
});

test("a model letter without comp paragraphs is completed by injectEvidence and then passes", () => {
  const letter = composeLetter(juanita);
  const table = compTable(juanita);
  const stripped = letter
    .replace(table + "\n\n", "")
    .split("\n\n")
    .filter((p) => !p.startsWith("Sale "))
    .join("\n\n");
  assert.ok(validateLetter(stripped, juanita).length >= juanita.comps.length, "bare letter fails per comp");
  const injected = injectEvidence(stripped, juanita);
  assert.ok(injected.includes(table));
  for (let i = 0; i < juanita.comps.length; i++) assert.ok(injected.includes(`Sale ${i + 1}: ${juanita.comps[i].address}`), `evidence ${i + 1}`);
  assert.deepEqual(validateLetter(injected, juanita), []);
  assert.equal(injectEvidence(injected, juanita), injected, "idempotent");
  assert.equal((injected.match(/Sale 1: /g) ?? []).length, 1, "no duplicate evidence");
});

test("a model paragraph that mis-states a comp's figure is a contradiction even after injection", () => {
  const c = juanita.comps[0];
  const wrong = composeLetter(juanita) + `\n\nComparable 1 at ${c.address} sold for $1,111,111, well under the assessment.\n`;
  const missing = validateLetter(injectEvidence(wrong, juanita), juanita);
  assert.ok(missing.some((m) => m.includes(c.address) && m.includes("$1,111,111")), String(missing));
});
