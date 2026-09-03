"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const store = useStore();
  const router = useRouter();
  useEffect(() => {
    if (store.hydrated && !store.session) router.replace("/login");
  }, [store.hydrated, store.session, router]);
  if (!store.hydrated || !store.session) {
    return <div className="min-h-dvh" aria-busy="true" />;
  }
  return <AppShell>{children}</AppShell>;
}
