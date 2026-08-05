"use client";

import { Github } from "lucide-react";
import { startOAuthFlow } from "@/lib/oauth";
import { Button } from "@/components/ui/button";

/** Shared "Continue with GitHub/Google" row for login and register —
 * both flows are identical (startOAuthFlow → provider's own authorize
 * page → /auth/callback/[provider] does the rest), so there's nothing
 * page-specific to parameterize beyond layout. No Google brand mark here
 * (lucide-react doesn't ship one, for trademark reasons) — a plain "G"
 * glyph stands in instead of a inaccurate substitute icon. */
export function OAuthButtons() {
  const githubEnabled = Boolean(process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID);
  const googleEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  if (!githubEnabled && !googleEnabled) return null;

  return (
    <>
      <div className="flex flex-col gap-2">
        {githubEnabled && (
          <Button type="button" variant="secondary" onClick={() => startOAuthFlow("github")}>
            <Github className="h-4 w-4" />
            Continue with GitHub
          </Button>
        )}
        {googleEnabled && (
          <Button type="button" variant="secondary" onClick={() => startOAuthFlow("google")}>
            <span aria-hidden className="text-sm font-semibold">
              G
            </span>
            Continue with Google
          </Button>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs text-text-muted">
        <div className="h-px flex-1 bg-border-subtle" />
        or
        <div className="h-px flex-1 bg-border-subtle" />
      </div>
    </>
  );
}
