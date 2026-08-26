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
  const authStatus = useAuthStore((s) => s.status);
  const [status, setStatus] = useState<"exchanging" | "waiting-for-session" | "error">("exchanging");
  const [error, setError] = useState<string | null>(null);

  const [pendingLink, setPendingLink] = useState<{ code: string; redirectUri: string } | null>(null);

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
    const mode = consumeOAuthState(state);
    if (!code || !mode) {
      setStatus("error");
      setError("This sign-in link is invalid or expired. Please try again.");
      return;
    }

    const redirectUri = oauthRedirectUri(provider as OAuthProvider);

    if (mode === "link") {

      setPendingLink({ code, redirectUri });
      setStatus("waiting-for-session");
      return;
    }

    apiPost<AuthTokenResponse>(`/auth/oauth/${provider}/callback`, { code, redirectUri })
      .then((res) => {
        setSession(res.accessToken, res.user);
        void syncFavoritesOnSignIn();
        router.push("/account");
      })
      .catch((err) => {
        setStatus("error");
        setError(err instanceof ApiClientError ? err.message : "Sign-in failed. Please try again.");
      });

  }, []);

  useEffect(() => {
    if (status !== "waiting-for-session" || !pendingLink || authStatus === "loading") return;

    if (authStatus === "anonymous") {
      setStatus("error");
      setError("Your session expired before the connection could finish. Please sign in and try again.");
      return;
    }

    apiPost(`/auth/oauth/${provider}/link`, pendingLink, { authenticated: true })
      .then(() => router.push("/account?connected=" + provider))
      .catch((err) => {
        setStatus("error");
        setError(err instanceof ApiClientError ? err.message : "Couldn't connect this account. Please try again.");
      });
  }, [status, pendingLink, authStatus, provider, router]);

  if (status === "exchanging" || status === "waiting-for-session") {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-sm text-text-secondary">
        {status === "waiting-for-session" ? "Connecting your account…" : "Signing you in…"}
      </div>
    );
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
