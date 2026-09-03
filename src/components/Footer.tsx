import { LEGAL_FOOTER } from "@/lib/letter";

export function LegalFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className={`border-t border-stone-200 text-ink-500 ${compact ? "px-4 py-3 text-[11px]" : "px-6 py-6 text-xs"}`}>
      <p className="mx-auto max-w-6xl leading-relaxed">
        {LEGAL_FOOTER} Appealwright is a pitch prototype. Northshore Appeals is a fictional demo tenant. No live MLS or assessor data is used.
      </p>
    </footer>
  );
}
