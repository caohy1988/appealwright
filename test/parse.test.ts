import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBaths, parseInteger, parseMoney, type ParseResult } from "../src/lib/parse";

const ok = (r: ParseResult) => (r.ok ? r.value : `invalid:${r.empty ? "empty" : r.reason}`);

test("well-formed grouping parses", () => {
  assert.equal(ok(parseMoney("1,250,000")), 1250000);
  assert.equal(ok(parseMoney("$1,250,000")), 1250000);
  assert.equal(ok(parseMoney(" $ 1,250,000 ")), 1250000);
  assert.equal(ok(parseMoney("1250000")), 1250000);
  assert.equal(ok(parseInteger("2,100")), 2100);
});

test("malformed grouping is invalid, not silently stripped", () => {
  for (const bad of ["1,,250,000", "12,50,000", "1,25,0000", ",250,000", "1,250,", "1,2500"]) {
    const r = parseMoney(bad);
    assert.equal(r.ok, false, bad);
    assert.ok(!r.ok && !r.empty, bad);
  }
});

test("integer-only fields reject decimals", () => {
  assert.equal(parseInteger("3.5").ok, false);
  assert.equal(parseInteger("2025.5").ok, false);
  assert.equal(parseInteger("2100.5").ok, false);
  assert.equal(parseMoney("1,250,000.50").ok, false);
});

test("baths accept .5 and 0.5 and 2.5", () => {
  assert.equal(ok(parseBaths("0.5")), 0.5);
  assert.equal(ok(parseBaths(".5")), 0.5);
  assert.equal(ok(parseBaths("2.5")), 2.5);
  assert.equal(ok(parseBaths("2")), 2);
  assert.equal(parseBaths("2.").ok, false);
});

test("blank is empty, garbage is invalid", () => {
  const blank = parseInteger("   ");
  assert.ok(!blank.ok && blank.empty);
  for (const bad of ["abc", "12a", "1 250 000", "--5", "5-"]) {
    const r = parseInteger(bad);
    assert.ok(!r.ok && !r.empty, bad);
  }
});
