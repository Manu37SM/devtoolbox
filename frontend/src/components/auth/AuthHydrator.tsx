"use client";

import { useEffect } from "react";
import type { AuthTokenResponse } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

// If the refresh call hasn't settled by this point, give up on it rather
// than let AccountNavLink hide the Login button forever (see below).
const REFRESH_TIMEOUT_MS = 8000;

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

    let cancelled = false;

    const hydrate = () => {
      const controller = new AbortController();
      // Without this timeout, a request that never settles (see the
      // visibilitychange listener below for why that happens in mobile
      // WebViews) leaves `status` stuck at "loading" forever, and
      // AccountNavLink renders nothing — the Login button never comes
      // back on its own.
      const timeoutId = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);

      apiPost<AuthTokenResponse>("/auth/refresh", undefined, { signal: controller.signal })
        .then((res) => {
          if (!cancelled) useAuthStore.getState().setSession(res.accessToken, res.user);
        })
        .catch(() => {
          if (!cancelled) useAuthStore.getState().clearSession();
        })
        .finally(() => clearTimeout(timeoutId));
    };

    hydrate();

    // Mobile WebViews (see mobile/App.tsx — this app is wrapped in a bare
    // WebView on iOS/Android) commonly pause in-flight fetches and timers
    // while the app is backgrounded, and don't always resume them cleanly.
    // If that happens mid-refresh, `status` can get stuck at "loading"
    // with nothing left to recover it — previously the only fix was a full
    // remount (e.g. tapping the logo link). Re-run hydration whenever the
    // page becomes visible again, but only while we're still stuck loading,
    // so this never re-fires after we already know the answer.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible" && useAuthStore.getState().status === "loading") {
        hydrate();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
