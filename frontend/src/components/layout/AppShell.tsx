"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { KeyboardShortcutsOverlay } from "@/components/layout/KeyboardShortcutsOverlay";
import { useCommandPaletteStore } from "@/store/command-palette-store";

// One shell, sixty tools (UI_GUIDELINES.md §1.2): fixed top bar, the
// middle content area is the only thing that changes per route. Left nav
// is tracked as follow-up work (see AUDIT_REPORT.md) — the command
// palette covers primary navigation for now.
export function AppShell({ children }: { children: React.ReactNode }) {
  const openPalette = useCommandPaletteStore((s) => s.open);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center gap-4 border-b border-border-subtle bg-bg-base px-6">
        <Link href="/" className="text-sm font-semibold text-text-primary">
          DevToolbox
        </Link>
        <nav className="flex items-center gap-4 text-sm text-text-secondary">
          <Link href="/" className="hover:text-text-primary">
            All tools
          </Link>
        </nav>
        <button
          onClick={openPalette}
          className="ml-4 flex flex-1 max-w-sm items-center gap-2 rounded-sm border border-border-default bg-bg-raised px-3 py-1.5 text-sm text-text-muted hover:border-accent"
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4" />
          Search tools…
          <kbd className="ml-auto rounded-sm border border-border-subtle px-1.5 py-0.5 text-xs">⌘K</kbd>
        </button>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <CommandPalette />
      <KeyboardShortcutsOverlay />
    </div>
  );
}
