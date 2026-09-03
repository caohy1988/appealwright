"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { PLANS } from "@/lib/seed";
import { Badge, Wordmark } from "./ui";
import { LegalFooter } from "./Footer";

const NAV = [
  { href: "/app", label: "Cases", match: (p: string) => p === "/app" || p.startsWith("/app/cases") },
  { href: "/app/new", label: "New case", match: (p: string) => p === "/app/new" },
  { href: "/app/settings/seats", label: "Seats and plan", match: (p: string) => p.startsWith("/app/settings") },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const plan = PLANS.find((p) => p.id === store.org.plan)!;
  const used = store.org.members.filter((m) => m.status !== "inactive").length;

  function signOut() {
    store.logout();
    router.push("/");
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((n) => {
        const active = n.match(pathname);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            className={`flex min-h-11 items-center rounded-md px-3 text-sm ${active ? "bg-stone-200 font-medium text-ink-950" : "text-ink-700 hover:bg-stone-100"}`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  const orgBlock = (
    <div className="rounded-md border border-stone-200 bg-white p-3">
      <div className="text-sm font-medium">{store.org.name}</div>
      <div className="mt-0.5 text-xs text-ink-500">{store.org.city}</div>
      <div className="mt-2 flex items-center gap-2">
        <Badge tone="ink">{plan.name}</Badge>
        <span className="text-xs text-ink-500 tnum">
          {used} of {plan.seats} seats
        </span>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-stone-200 bg-stone-50/95 px-4 backdrop-blur md:hidden">
        <Link href="/app" className="flex min-h-11 items-center">
          <Wordmark />
        </Link>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex h-11 w-11 items-center justify-center rounded-md text-ink-950 hover:bg-stone-200"
        >
          <span aria-hidden className="relative block h-3.5 w-5">
            <span className={`absolute left-0 top-0 h-0.5 w-5 bg-current transition-transform ${open ? "translate-y-1.5 rotate-45" : ""}`} />
            <span className={`absolute left-0 top-1.5 h-0.5 w-5 bg-current transition-opacity ${open ? "opacity-0" : ""}`} />
            <span className={`absolute left-0 top-3 h-0.5 w-5 bg-current transition-transform ${open ? "-translate-y-1.5 -rotate-45" : ""}`} />
          </span>
        </button>
      </header>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink-950/30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-[82%] max-w-xs flex-col gap-4 border-l border-stone-200 bg-stone-50 p-4 pt-16 shadow-xl">
            {orgBlock}
            {nav}
            <div className="mt-auto flex flex-col gap-1">
              <button type="button" onClick={signOut} className="flex min-h-11 items-center rounded-md px-3 text-left text-sm text-ink-700 hover:bg-stone-100">
                Sign out
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex flex-1 md:grid md:grid-cols-[232px_minmax(0,1fr)]">
        {/* Desktop sidebar */}
        <aside className="hidden border-r border-stone-200 bg-stone-50 md:flex md:flex-col md:gap-4 md:p-4 md:sticky md:top-0 md:h-dvh">
          <Link href="/app" className="flex min-h-11 items-center px-1">
            <Wordmark />
          </Link>
          {orgBlock}
          {nav}
          <div className="mt-auto flex flex-col gap-1">
            <div className="px-3 text-xs text-ink-500">Signed in as Maya Lindqvist</div>
            <button type="button" onClick={signOut} className="flex min-h-11 items-center rounded-md px-3 text-left text-sm text-ink-700 hover:bg-stone-100">
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-8">{children}</main>
          <LegalFooter compact />
        </div>
      </div>
    </div>
  );
}
