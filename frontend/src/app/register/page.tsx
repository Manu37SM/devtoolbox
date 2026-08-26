"use client";

import { Suspense, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { AuthTokenResponse } from "@devtoolbox/shared";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { syncFavoritesOnSignIn } from "@/lib/sync";
import { OAuthButtons } from "@/components/auth/OAuthButtons";
import { TurnstileWidget, type TurnstileHandle } from "@/components/auth/TurnstileWidget";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TURNSTILE_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = searchParams.get("next");
  const redirectTo = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
  const setSession = useAuthStore((s) => s.setSession);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiPost<AuthTokenResponse>("/auth/register", {
        email,
        password,
        displayName: displayName || undefined,
        captchaToken: captchaToken ?? undefined,
      });
      setSession(res.accessToken, res.user);
      void syncFavoritesOnSignIn();
      router.push(redirectTo);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
      setCaptchaToken(null);
      turnstileRef.current?.reset();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Create an account</h1>
        <p className="mt-1 text-sm text-text-secondary">Free, optional, and never required to use any tool.</p>
      </div>

      <OAuthButtons />

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-text-primary">
          Name (optional)
          <Input autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-text-primary">
          Email
          <Input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-text-primary">
          Password
          <Input
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className="text-xs text-text-secondary">At least 10 characters.</span>
        </label>

        <TurnstileWidget ref={turnstileRef} onVerify={setCaptchaToken} onExpire={() => setCaptchaToken(null)} />

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={submitting || (TURNSTILE_CONFIGURED && !captchaToken)}>
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-accent hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
