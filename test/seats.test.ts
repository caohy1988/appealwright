import { test } from "node:test";
import assert from "node:assert/strict";
import { ORG, PLANS } from "../src/lib/seed";
import { applyInvite, applyMemberStatus, applyPlan, assertSeatAvailable, planFor, seatsInUse } from "../src/lib/seats";
import type { Member, Org } from "../src/lib/types";

function member(i: number, status: Member["status"]): Member {
  return { id: `x${i}`, name: `Person ${i}`, email: `p${i}@example.test`, role: "analyst", status, joinedAt: "2026-01-01" };
}

function fullOrg(): Org {
  const plan = planFor("team");
  const members = [...ORG.members];
  let i = 0;
  while (seatsInUse(members) < plan.seats) members.push(member(i++, "active"));
  members.push(member(99, "inactive"));
  return { ...ORG, plan: "team", members };
}

test("reactivating at the seat cap returns ok:false with a message and leaves org unchanged", () => {
  const org = fullOrg();
  assert.equal(seatsInUse(org.members), planFor("team").seats);
  const r = applyMemberStatus(org, "x99", "active");
  assert.equal(r.ok, false);
  assert.ok(!r.ok && /seats on Team are in use/.test(r.message));
  assert.equal(r.org, org);
});

test("reactivating with a free seat succeeds; deactivating never needs a seat", () => {
  const org = fullOrg();
  const freed = applyMemberStatus(org, org.members[1].id, "inactive");
  assert.equal(freed.ok, true);
  const back = applyMemberStatus(freed.org, "x99", "active");
  assert.equal(back.ok, true);
  assert.equal(back.org.members.find((m) => m.id === "x99")?.status, "active");
});

test("assertSeatAvailable distinguishes invite and reactivate copy", () => {
  const plan = PLANS[0];
  const members = [member(1, "active"), member(2, "pending"), member(3, "active")];
  assert.equal(assertSeatAvailable(members, plan, "invite").ok, false);
  assert.match(assertSeatAvailable(members, plan, "reactivate", "Ana").message!, /reactivating Ana/);
  assert.equal(assertSeatAvailable(members.slice(0, 2), plan, "invite").ok, true);
});

test("invite validates email, duplicates, and cap", () => {
  assert.equal(applyInvite(ORG, "nope").ok, false);
  assert.equal(applyInvite(ORG, ORG.members[0].email).ok, false);
  const r = applyInvite(ORG, "New.Analyst@firm.test", 1);
  assert.equal(r.ok, true);
  assert.equal(r.org.members.at(-1)?.status, "pending");
  assert.equal(r.org.members.at(-1)?.name, "New Analyst");
  assert.equal(applyInvite(fullOrg(), "late@firm.test").ok, false);
});

test("plan downgrade below seats in use is blocked", () => {
  const org = fullOrg();
  const down = applyPlan(org, "starter");
  assert.equal(down.ok, false);
  const up = applyPlan(org, "firm");
  assert.equal(up.ok, true);
  assert.equal(up.org.plan, "firm");
});
