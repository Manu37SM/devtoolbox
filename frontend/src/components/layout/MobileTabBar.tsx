"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Search, User } from "lucide-react";
import { useCommandPaletteStore } from "@/store/command-palette-store";
import { useNavStore } from "@/store/nav-store";
import { useAuthStore } from "@/store/auth-store";

const item = "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] text-text-muted";

/** Thumb-reach navigation for phones. Hidden on desktop, where the sidebar and header cover this. */
export function MobileTabBar() {
  const pathname = usePathname();
  const openPalette = useCommandPaletteStore((s) => s.open);
  const openNav = useNavStore((s) => s.openMobile);
  const signedIn = useAuthStore((s) => s.status === "authenticated");
  const accountHref = signedIn ? "/account" : "/login";

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border-subtle bg-bg-base pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <Link href="/" aria-current={pathname === "/" ? "page" : undefined} className={`${item} ${pathname === "/" ? "text-accent" : ""}`}>
        <Home className="h-5 w-5" aria-hidden="true" />
        Home
      </Link>
      <button type="button" onClick={openPalette} className={item}>
        <Search className="h-5 w-5" aria-hidden="true" />
        Search
      </button>
      <button type="button" onClick={openNav} className={item}>
        <LayoutGrid className="h-5 w-5" aria-hidden="true" />
        Categories
      </button>
      <Link href={accountHref} className={`${item} ${pathname.startsWith("/account") ? "text-accent" : ""}`}>
        <User className="h-5 w-5" aria-hidden="true" />
        {signedIn ? "Account" : "Log in"}
      </Link>
    </nav>
  );
}
