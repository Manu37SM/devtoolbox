"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

/** Small header link that swaps between "Log in" and the signed-in user's
 * name/avatar — mirrors ThemeToggle's placement in AppShell's header.
 * Renders nothing while auth status is still hydrating to avoid a
 * flash-of-wrong-state. */
export function AccountNavLink() {
  const { user, status } = useAuthStore();

  if (status === "loading") return null;

  if (status === "anonymous" || !user) {
    return (
      <Link
        href="/login"
        className="rounded-sm px-2 py-1 text-sm text-text-secondary hover:bg-bg-raised hover:text-text-primary"
      >
        Log in
      </Link>
    );
  }

  return (
    <Link
      href="/account"
      className="flex items-center gap-1.5 rounded-sm px-2 py-1 text-sm text-text-secondary hover:bg-bg-raised hover:text-text-primary"
    >
      <User className="h-4 w-4" />
      {user.displayName ?? user.email}
    </Link>
  );
}
