"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui";

export function LetterEditor({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      const ta = document.getElementById("letter-textarea") as HTMLTextAreaElement | null;
      ta?.select();
      document.execCommand("copy");
      setCopied(true);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 px-4 py-2">
        <Button variant="secondary" onClick={copy} disabled={disabled || !value}>
          {copied ? "Copied" : "Copy letter"}
        </Button>
        <Button variant="secondary" onClick={() => window.print()} disabled={disabled || !value}>
          Print / PDF
        </Button>
        <span className="ml-auto text-[11px] text-ink-500">Edits save locally</span>
      </div>
      <textarea
        id="letter-textarea"
        className="letter-body block w-full resize-y bg-white px-4 py-4 text-ink-950 focus:outline-none min-h-[60vh] md:min-h-[70vh]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        spellCheck={false}
        aria-label="Appeal letter"
      />
      <div id="letter-print" aria-hidden>
        {value}
      </div>
    </div>
  );
}
