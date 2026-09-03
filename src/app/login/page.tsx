"use client";

import { useRouter } from "next/navigation";
import { LegalFooter } from "@/components/Footer";
import { Button, Wordmark } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function Login() {
  const store = useStore();
  const router = useRouter();
  function go() {
    store.login();
    router.push("/app");
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-6 md:p-8">
          <Wordmark />
          <h1 className="mt-6 text-xl font-semibold tracking-tight">Sign in to your desk</h1>
          <p className="mt-2 text-sm text-ink-700">This is a demo workspace. No password, no account, nothing leaves your browser except the drafting call.</p>
          <Button onClick={go} size="lg" className="mt-6 w-full">
            Continue as Northshore Appeals
          </Button>
          <div className="mt-4 rounded-md bg-stone-100 p-3 text-xs text-ink-700">
            <div className="font-medium text-ink-950">Northshore Appeals</div>
            <div>Kirkland, WA · King County residential · Team plan, 4 of 10 seats</div>
          </div>
        </div>
      </main>
      <LegalFooter />
    </div>
  );
}
