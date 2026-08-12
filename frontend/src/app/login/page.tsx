"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { AuthTokenResponse } from "@devtoolbox/shared";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { syncFavoritesOnSignIn } from "@/lib/sync";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { SsoLoginForm } from "@/components/auth/SsoLoginForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // `next` lets a page like /invites/[token] send the user here and get
  // them back afterward — only ever a same-app relative path (never an
  // absolute/external URL) since it's only ever set by this codebase's own
  // links, never echoed from a query param an attacker fully controls
  // without this check.
  const next = searchParams.get("next");
  const redirectTo = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiPost<AuthTokenResponse>("/auth/login", { email, password });
      setSession(res.accessToken, res.user);
      void syncFavoritesOnSignIn();
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Log in</h1>
        <p className="mt-1 text-sm text-text-secondary">
          Sync your favorites, history, and pipelines across devices. Every tool still works without an account.
        </p>
      </div>

      <OAuthButtons />

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-text-primary">
          Email
          <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-text-primary">
          Password
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Logging in…" : "Log in"}
        </Button>
      </form>

      <div className="flex flex-col gap-2 text-sm text-text-secondary">
        <Link href="/reset-password" className="hover:text-text-primary hover:underline">
          Forgot your password?
        </Link>
        <p>
          No account?{" "}
          <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="text-accent hover:underline">
            Register
          </Link>
        </p>
      </div>

      <div className="border-t border-border-subtle pt-4">
        <SsoLoginForm />
      </div>
    </div>
  );
}
