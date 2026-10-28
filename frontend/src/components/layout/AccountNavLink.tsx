"use client";

import Link from "next/link";
import { User } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

export function AccountNavLink() {
  const { user, status } = useAuthStore();

  if (status === "loading") return null;

  if (status === "anonymous" || !user) {
    return (
      <Link
        href="/login"
        className="whitespace-nowrap rounded-sm px-2 py-1 text-sm text-text-secondary hover:bg-bg-raised hover:text-text-primary"
      >
        Log in
      </Link>
    );
  }

  return (
    <Link
      href="/account"
      aria-label="Account"
      className="flex items-center gap-1.5 whitespace-nowrap rounded-sm px-2 py-1 text-sm text-text-secondary hover:bg-bg-raised hover:text-text-primary"
    >
      <User className="h-4 w-4 shrink-0" />
      <span className="hidden max-w-[10rem] truncate sm:inline">{user.displayName ?? user.email}</span>
    </Link>
  );
}
