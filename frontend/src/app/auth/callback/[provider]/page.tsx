"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { AuthTokenResponse, OAuthProvider } from "@devtoolbox/shared";
import { OAuthProviders } from "@devtoolbox/shared";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { consumeOAuthState, oauthRedirectUri } from "@/lib/oauth";
import { useAuthStore } from "@/store/auth-store";
import { syncFavoritesOnSignIn } from "@/lib/sync";

interface CallbackPageProps {
  params: Promise<{ provider: string }>;
}

export default function OAuthCallbackPage({ params }: CallbackPageProps) {
  const { provider } = use(params);
  return (
    <Suspense fallback={null}>
      <OAuthCallbackContent provider={provider} />
    </Suspense>
  );
}

function OAuthCallbackContent({ provider }: { provider: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [status, setStatus] = useState<"exchanging" | "error">("exchanging");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!OAuthProviders.includes(provider as OAuthProvider)) {
      setStatus("error");
      setError(`Unsupported provider "${provider}".`);
      return;
    }

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const providerError = searchParams.get("error");

    if (providerError) {
      setStatus("error");
      setError("Sign-in was cancelled or denied.");
      return;
    }
    if (!code || !consumeOAuthState(state)) {
      setStatus("error");
      setError("This sign-in link is invalid or expired. Please try again.");
      return;
    }

    apiPost<AuthTokenResponse>(`/auth/oauth/${provider}/callback`, {
      code,
      redirectUri: oauthRedirectUri(provider as OAuthProvider),
    })
      .then((res) => {
        setSession(res.accessToken, res.user);
        void syncFavoritesOnSignIn();
        router.push("/account");
      })
      .catch((err) => {
        setStatus("error");
        setError(err instanceof ApiClientError ? err.message : "Sign-in failed. Please try again.");
      });
    // Intentionally runs once — re-running on searchParams identity churn
    // would re-consume an already-cleared state value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === "exchanging") {
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
