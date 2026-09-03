"use client";

import { useState } from "react";
import { Badge, Button, Card, SectionTitle } from "@/components/ui";
import { money } from "@/lib/format";
import { PLANS } from "@/lib/seed";
import { useStore } from "@/lib/store";

export default function Seats() {
  const store = useStore();
  const plan = PLANS.find((p) => p.id === store.org.plan)!;
  const members = store.org.members;
  const used = members.filter((m) => m.status !== "inactive").length;
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function invite(e: React.FormEvent) {
    e.preventDefault();
    const r = store.invite(email);
    setMsg(r.ok ? { ok: true, text: `Invitation queued for ${email.trim()}. Demo only, no email is sent.` } : { ok: false, text: r.message! });
    if (r.ok) setEmail("");
  }

  function switchPlan(id: (typeof PLANS)[number]["id"]) {
    const r = store.setPlan(id);
    setMsg(r.ok ? { ok: true, text: `Plan switched to ${PLANS.find((p) => p.id === id)!.name}. Billing is not connected in this demo.` } : { ok: false, text: r.message! });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">Seats and plan</h1>
      <p className="mt-1 text-sm text-ink-700">{store.org.name} · billed monthly per firm. No payment processor is connected in this prototype.</p>

      <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          <Card>
            <SectionTitle right={<span className="text-xs text-ink-500 tnum">{used} of {plan.seats} seats</span>}>Team</SectionTitle>
            <div className="px-4 pt-4">
              <div className="h-2 w-full overflow-hidden rounded bg-stone-200">
                <div className="h-full bg-ink-950" style={{ width: `${Math.min(100, (used / plan.seats) * 100)}%` }} />
              </div>
            </div>
            <ul className="mt-2 divide-y divide-stone-200">
              {members.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`truncate text-sm font-medium ${m.status === "inactive" ? "text-ink-400 line-through" : ""}`}>{m.name}</span>
                      <Badge tone={m.status === "active" ? "moss" : m.status === "pending" ? "neutral" : "rust"}>{m.status}</Badge>
                    </div>
                    <div className="truncate text-xs text-ink-500">
                      {m.email} · {m.role}
                    </div>
                  </div>
                  <div className="shrink-0">
                    {m.role === "owner" ? (
                      <span className="text-xs text-ink-500">Owner</span>
                    ) : m.status === "inactive" ? (
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const r = store.setMemberStatus(m.id, "active");
                          setMsg(r.ok ? { ok: true, text: `${m.name} reactivated.` } : { ok: false, text: r.message! });
                        }}
                      >
                        Reactivate
                      </Button>
                    ) : (
                      <Button
                        variant="danger"
                        onClick={() => {
                          store.setMemberStatus(m.id, "inactive");
                          setMsg({ ok: true, text: `${m.name} deactivated. The seat is free.` });
                        }}
                      >
                        Deactivate
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <form onSubmit={invite} className="flex flex-col gap-2 border-t border-stone-200 p-4 sm:flex-row" noValidate>
              <input
                type="email"
                inputMode="email"
                autoComplete="off"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@yourfirm.com"
                aria-label="Email to invite"
                className="min-h-11 flex-1 rounded-md border border-stone-300 bg-white px-3 text-base focus:border-ink-950 focus:outline-none md:text-sm"
              />
              <Button type="submit">Invite</Button>
            </form>
            {msg ? <div className={`border-t border-stone-200 px-4 py-2 text-xs ${msg.ok ? "text-moss-700" : "text-rust-700"}`}>{msg.text}</div> : null}
          </Card>
        </div>

        <div className="flex flex-col gap-5">
          <Card>
            <SectionTitle>Current plan</SectionTitle>
            <div className="p-4">
              <div className="flex items-baseline justify-between">
                <div className="text-lg font-semibold">{plan.name}</div>
                <div className="text-lg font-semibold tnum">
                  {money(plan.priceMonthly)}
                  <span className="text-xs font-normal text-ink-500">/mo</span>
                </div>
              </div>
              <div className="mt-1 text-sm text-ink-700 tnum">{plan.seats} seats · unlimited cases</div>
              <p className="mt-2 text-xs text-ink-500">{plan.blurb}</p>
            </div>
          </Card>
          <Card>
            <SectionTitle>Switch plan</SectionTitle>
            <ul className="divide-y divide-stone-200">
              {PLANS.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-ink-500 tnum">
                      {p.seats} seats · {money(p.priceMonthly)}/mo
                    </div>
                  </div>
                  {p.id === plan.id ? (
                    <Badge tone="ink">Current</Badge>
                  ) : (
                    <Button variant="secondary" onClick={() => switchPlan(p.id)}>
                      {PLANS.indexOf(p) > PLANS.indexOf(plan) ? "Upgrade" : "Downgrade"}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <div className="border-t border-stone-200 px-4 py-2 text-[11px] text-ink-500">UI only. No charge is made.</div>
          </Card>
          <Button variant="ghost" onClick={() => store.reset()} className="self-start">
            Reset demo data
          </Button>
        </div>
      </div>
    </div>
  );
}
