"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { AuthTokenResponse } from "@devtoolbox/shared";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { syncFavoritesOnSignIn } from "@/lib/sync";

export default function SsoOidcCallbackPage() {
  return (
    <Suspense fallback={null}>
      <SsoOidcCallbackContent />
    </Suspense>
  );
}

function SsoOidcCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const providerError = searchParams.get("error");

    if (providerError) {
      setError("SSO sign-in was cancelled or denied by your identity provider.");
      return;
    }
    if (!code || !state) {
      setError("This SSO sign-in link is invalid or expired. Please try again.");
      return;
    }

    const redirectUri = `${window.location.origin}/sso/callback`;
    apiPost<AuthTokenResponse>("/sso/oidc/callback", { code, state, redirectUri })
      .then((res) => {
        setSession(res.accessToken, res.user);
        void syncFavoritesOnSignIn();
        router.push("/account");
      })
      .catch((err) => {
        setError(err instanceof ApiClientError ? err.message : "SSO sign-in failed. Please try again.");
      });

  }, []);

  if (!error) {
    return <div className="mx-auto max-w-sm px-4 py-16 text-sm text-text-secondary">Signing you in…</div>;
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-xl font-semibold text-text-primary">Couldn&apos;t sign in</h1>
      <p className="mt-2 text-sm text-danger">{error}</p>
      <Link href="/login" className="mt-4 inline-block text-sm text-accent hover:underline">
        Back to login
      </Link>
    </div>
  );
}
