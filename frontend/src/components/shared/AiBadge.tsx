import { Sparkles } from "lucide-react";

/** Marks tools that call the AI gateway (the only tools with usage limits). */
export function AiBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Uses AI. Free with usage limits; higher limits on Pro."
      className={`inline-flex shrink-0 items-center gap-1 rounded-sm bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent ${className}`}
    >
      <Sparkles className="h-3 w-3" aria-hidden="true" />
      AI
    </span>
  );
}
