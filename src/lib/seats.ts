import { PLANS } from "./seed";
import type { Member, Org, Plan, PlanId } from "./types";

export type SeatResult = { ok: true; org: Org } | { ok: false; message: string; org: Org };

export function planFor(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id)!;
}

// Active and pending members both hold a seat.
export function seatsInUse(members: Member[]): number {
  return members.filter((m) => m.status !== "inactive").length;
}

export function assertSeatAvailable(members: Member[], plan: Plan, action: "invite" | "reactivate", who?: string): { ok: boolean; message?: string } {
  if (seatsInUse(members) < plan.seats) return { ok: true };
  const tail = action === "reactivate" ? `Deactivate someone else or upgrade before reactivating ${who ?? "this member"}.` : "Deactivate a member or upgrade.";
  return { ok: false, message: `All ${plan.seats} seats on ${plan.name} are in use. ${tail}` };
}

export function applyMemberStatus(org: Org, id: string, status: Member["status"]): SeatResult {
  const target = org.members.find((m) => m.id === id);
  if (!target) return { ok: false, message: "Member not found.", org };
  if (status !== "inactive" && target.status === "inactive") {
    const check = assertSeatAvailable(org.members, planFor(org.plan), "reactivate", target.name);
    if (!check.ok) return { ok: false, message: check.message!, org };
  }
  return { ok: true, org: { ...org, members: org.members.map((m) => (m.id === id ? { ...m, status } : m)) } };
}

export function applyInvite(org: Org, email: string, now = Date.now()): SeatResult {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, message: "Enter a valid email address.", org };
  if (org.members.some((m) => m.email === e)) return { ok: false, message: "That person is already on the team.", org };
  const check = assertSeatAvailable(org.members, planFor(org.plan), "invite");
  if (!check.ok) return { ok: false, message: check.message!, org };
  const name = e.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const m: Member = { id: `m${now}`, name, email: e, role: "analyst", status: "pending", joinedAt: new Date(now).toISOString().slice(0, 10) };
  return { ok: true, org: { ...org, members: [...org.members, m] } };
}

export function applyPlan(org: Org, planId: PlanId): SeatResult {
  const target = planFor(planId);
  const used = seatsInUse(org.members);
  if (used > target.seats) {
    return { ok: false, message: `${target.name} has ${target.seats} seats but ${used} are in use. Deactivate ${used - target.seats} first.`, org };
  }
  return { ok: true, org: { ...org, plan: planId } };
}
