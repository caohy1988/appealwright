"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ORG, PLANS, SUBJECTS } from "./seed";
import type { CaseStatus, Draft, Member, Org, PlanId, Subject } from "./types";

const KEY = "appealwright.v1";

type Persisted = {
  session: boolean;
  cases: Subject[];
  drafts: Record<string, Draft>;
  org: Org;
  exclusions: Record<string, string[]>;
};

type Store = Persisted & {
  hydrated: boolean;
  login: () => void;
  logout: () => void;
  addCase: (s: Subject) => void;
  setCaseStatus: (id: string, status: CaseStatus) => void;
  saveDraft: (d: Draft) => void;
  clearDraft: (caseId: string) => void;
  invite: (email: string) => { ok: boolean; message?: string };
  setMemberStatus: (id: string, status: Member["status"]) => { ok: boolean; message?: string };
  setExclusions: (caseId: string, compIds: string[]) => void;
  setPlan: (plan: PlanId) => { ok: boolean; message?: string };
  reset: () => void;
};

const initial: Persisted = { session: false, cases: SUBJECTS, drafts: {}, org: ORG, exclusions: {} };

const Ctx = createContext<Store | null>(null);

function mergeCases(stored: Subject[] | undefined): Subject[] {
  const byId = new Map<string, Subject>();
  for (const s of SUBJECTS) byId.set(s.id, s);
  for (const s of stored ?? []) byId.set(s.id, s.seeded ? { ...byId.get(s.id)!, status: s.status } : s);
  return [...byId.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Persisted>(initial);
  const [hydrated, setHydrated] = useState(false);
  const skipWrite = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<Persisted>;
        // One-time localStorage hydration after mount; SSR renders the seed state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState({
          session: Boolean(p.session),
          cases: mergeCases(p.cases),
          drafts: p.drafts ?? {},
          org: p.org ?? ORG,
          exclusions: p.exclusions ?? {},
        });
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipWrite.current) {
      skipWrite.current = false;
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {}
  }, [state, hydrated]);

  const login = useCallback(() => setState((s) => ({ ...s, session: true })), []);
  const logout = useCallback(() => setState((s) => ({ ...s, session: false })), []);
  const addCase = useCallback((c: Subject) => setState((s) => ({ ...s, cases: [c, ...s.cases.filter((x) => x.id !== c.id)] })), []);
  const setCaseStatus = useCallback(
    (id: string, status: CaseStatus) => setState((s) => ({ ...s, cases: s.cases.map((c) => (c.id === id ? { ...c, status } : c)) })),
    [],
  );
  const saveDraft = useCallback((d: Draft) => setState((s) => ({ ...s, drafts: { ...s.drafts, [d.caseId]: d } })), []);
  const clearDraft = useCallback(
    (caseId: string) =>
      setState((s) => {
        const drafts = { ...s.drafts };
        delete drafts[caseId];
        return { ...s, drafts };
      }),
    [],
  );

  const invite = useCallback(
    (email: string) => {
      const e = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return { ok: false, message: "Enter a valid email address." };
      let result = { ok: true } as { ok: boolean; message?: string };
      setState((s) => {
        const plan = PLANS.find((p) => p.id === s.org.plan)!;
        const used = s.org.members.filter((m) => m.status !== "inactive").length;
        if (s.org.members.some((m) => m.email === e)) {
          result = { ok: false, message: "That person is already on the team." };
          return s;
        }
        if (used >= plan.seats) {
          result = { ok: false, message: `All ${plan.seats} seats on ${plan.name} are in use. Deactivate a member or upgrade.` };
          return s;
        }
        const name = e.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const m: Member = { id: `m${Date.now()}`, name, email: e, role: "analyst", status: "pending", joinedAt: new Date().toISOString().slice(0, 10) };
        return { ...s, org: { ...s.org, members: [...s.org.members, m] } };
      });
      return result;
    },
    [],
  );

  const setMemberStatus = useCallback((id: string, status: Member["status"]) => {
    let result = { ok: true } as { ok: boolean; message?: string };
    setState((s) => {
      const target = s.org.members.find((m) => m.id === id);
      if (!target) return s;
      if (status !== "inactive" && target.status === "inactive") {
        const plan = PLANS.find((p) => p.id === s.org.plan)!;
        const used = s.org.members.filter((m) => m.status !== "inactive").length;
        if (used >= plan.seats) {
          result = { ok: false, message: `All ${plan.seats} seats on ${plan.name} are in use. Deactivate someone else or upgrade before reactivating ${target.name}.` };
          return s;
        }
      }
      return { ...s, org: { ...s.org, members: s.org.members.map((m) => (m.id === id ? { ...m, status } : m)) } };
    });
    return result;
  }, []);

  const setExclusions = useCallback(
    (caseId: string, compIds: string[]) => setState((s) => ({ ...s, exclusions: { ...s.exclusions, [caseId]: compIds } })),
    [],
  );

  const setPlan = useCallback((plan: PlanId) => {
    let result = { ok: true } as { ok: boolean; message?: string };
    setState((s) => {
      const target = PLANS.find((p) => p.id === plan)!;
      const used = s.org.members.filter((m) => m.status !== "inactive").length;
      if (used > target.seats) {
        result = { ok: false, message: `${target.name} has ${target.seats} seats but ${used} are in use. Deactivate ${used - target.seats} first.` };
        return s;
      }
      return { ...s, org: { ...s.org, plan } };
    });
    return result;
  }, []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setState({ ...initial, session: true });
  }, []);

  const value = useMemo<Store>(
    () => ({ ...state, hydrated, login, logout, addCase, setCaseStatus, saveDraft, clearDraft, invite, setMemberStatus, setExclusions, setPlan, reset }),
    [state, hydrated, login, logout, addCase, setCaseStatus, saveDraft, clearDraft, invite, setMemberStatus, setExclusions, setPlan, reset],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}
