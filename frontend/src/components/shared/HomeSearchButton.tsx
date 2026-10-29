"use client";

import { Search } from "lucide-react";
import { useCommandPaletteStore } from "@/store/command-palette-store";

export function HomeSearchButton({ total }: { total: number }) {
  const open = useCommandPaletteStore((s) => s.open);
  return (
    <button
      type="button"
      onClick={open}
      aria-haspopup="dialog"
      className="mt-6 flex w-full max-w-xl items-center gap-3 rounded-md border border-border-default bg-bg-raised px-4 py-3 text-left text-text-muted shadow-sm transition-colors hover:border-accent"
    >
      <Search className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="flex-1">Search {total} tools…</span>
      <kbd className="hidden rounded-sm border border-border-subtle px-1.5 py-0.5 text-xs sm:inline">⌘K</kbd>
    </button>
  );
}
