"use client";

import Link from "next/link";
import { Search, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { AccountNavLink } from "@/components/layout/AccountNavLink";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { KeyboardShortcutsOverlay } from "@/components/layout/KeyboardShortcutsOverlay";
import { LeftNav } from "@/components/layout/LeftNav";
import { useCommandPaletteStore } from "@/store/command-palette-store";
import { useNavStore } from "@/store/nav-store";
import { useAuthStore } from "@/store/auth-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const openPalette = useCommandPaletteStore((s) => s.open);
  const openMobileNav = useNavStore((s) => s.openMobile);
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center gap-4 border-b border-border-subtle bg-bg-base px-6">
        <button
          onClick={openMobileNav}
          aria-label="Open navigation"
          className="rounded-sm p-1 hover:bg-bg-raised lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="text-sm font-semibold text-text-primary">
          DevToolbox
        </Link>
        <nav className="hidden items-center gap-4 text-sm text-text-secondary lg:flex">
          <Link href="/" className="hover:text-text-primary">
            All tools
          </Link>
          <Link href="/pipelines" className="hover:text-text-primary">
            Pipelines
          </Link>
          <Link href="/plugins" className="hover:text-text-primary">
            Plugins
          </Link>
          {isAuthenticated && (
            <Link href="/snippets" className="hover:text-text-primary">
              Snippets
            </Link>
          )}
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
          <AccountNavLink />
          <ThemeToggle />
        </div>
      </header>
      <div className="flex flex-1">
        <LeftNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <CommandPalette />
      <KeyboardShortcutsOverlay />
    </div>
  );
}
