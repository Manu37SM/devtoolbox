"use client";

import { useEffect } from "react";
import type { AuthTokenResponse } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";

const REFRESH_TIMEOUT_MS = 8000;

export function AuthHydrator() {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_API_BASE_URL) {

      useAuthStore.getState().clearSession();
      return;
    }

    let cancelled = false;

    const hydrate = () => {
      const controller = new AbortController();

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
