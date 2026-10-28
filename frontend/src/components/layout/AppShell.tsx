"use client";

import Link from "next/link";
import { Search, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { AccountNavLink } from "@/components/layout/AccountNavLink";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { KeyboardShortcutsOverlay } from "@/components/layout/KeyboardShortcutsOverlay";
import { LeftNav } from "@/components/layout/LeftNav";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { useCommandPaletteStore } from "@/store/command-palette-store";
import { useNavStore } from "@/store/nav-store";
import { useAuthStore } from "@/store/auth-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const openPalette = useCommandPaletteStore((s) => s.open);
  const openMobileNav = useNavStore((s) => s.openMobile);
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border-subtle bg-bg-base px-3 sm:gap-4 sm:px-6">
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
          <Link href="/pricing" className="hover:text-text-primary">
            Pricing
          </Link>
          {isAuthenticated && (
            <Link href="/snippets" className="hover:text-text-primary">
              Snippets
            </Link>
          )}
        </nav>
        <button
          onClick={openPalette}
          aria-label="Search tools"
          className="ml-auto flex items-center gap-2 rounded-sm border border-border-default bg-bg-raised p-2 text-sm text-text-muted hover:border-accent sm:ml-4 sm:max-w-sm sm:flex-1 sm:px-3 sm:py-1.5 lg:ml-4"
          aria-haspopup="dialog"
          aria-keyshortcuts="Control+K Meta+K"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">Search tools…</span>
          <kbd className="ml-auto hidden rounded-sm border border-border-subtle px-1.5 py-0.5 text-xs sm:inline">⌘K</kbd>
        </button>
        <div className="flex items-center gap-1 sm:ml-auto">
          <AccountNavLink />
          <ThemeToggle />
        </div>
      </header>
      <div className="flex flex-1">
        <LeftNav />
        <main className="min-w-0 flex-1 pb-14 lg:pb-0">{children}</main>
      </div>
      <MobileTabBar />
      <CommandPalette />
      <KeyboardShortcutsOverlay />
    </div>
  );
}
