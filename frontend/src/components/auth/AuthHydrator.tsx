"use client";

import { useEffect } from "react";
import type { AuthTokenResponse } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

// Silently re-establishes a session on load using the httpOnly refresh
// cookie, since the access token itself is memory-only (auth-store.ts) and
// lost on every hard refresh. Rendered once from the root layout, same
// pattern as ServiceWorkerRegistration. A failed refresh (no cookie, or an
// expired/revoked one) just means the visitor is anonymous — not an error
// state, so nothing is surfaced to the user for it.
export function AuthHydrator() {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_API_BASE_URL) {
      // No backend configured for this deployment — every tool still
      // works client-only, accounts just aren't available.
      useAuthStore.getState().clearSession();
      return;
    }

    apiPost<AuthTokenResponse>("/auth/refresh", undefined)
      .then((res) => useAuthStore.getState().setSession(res.accessToken, res.user))
      .catch(() => useAuthStore.getState().clearSession());
  }, []);

  return null;
}
