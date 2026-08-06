"use client";

import { Github } from "lucide-react";
import { startOAuthFlow, type OAuthFlowMode } from "@/lib/oauth";
import { Button } from "@/components/ui/button";

/** Shared "Continue with GitHub/Google" row for login and register —
 * both flows are identical (startOAuthFlow → provider's own authorize
 * page → /auth/callback/[provider] does the rest), so there's nothing
 * page-specific to parameterize beyond layout. No Google brand mark here
 * (lucide-react doesn't ship one, for trademark reasons) — a plain "G"
 * glyph stands in instead of a inaccurate substitute icon.
 *
 * `mode: "link"` reuses this same component for the "Connect GitHub/Google"
 * buttons on /account (already-signed-in users adding a provider to their
 * existing account) — `startOAuthFlow` stashes the mode so the callback
 * page knows to call the link endpoint instead of the sign-in one. */
export function OAuthButtons({
  mode = "signin",
  connectedProviders = [],
}: {
  mode?: OAuthFlowMode;
  connectedProviders?: Array<"github" | "google">;
}) {
  const githubEnabled = Boolean(process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID) && !connectedProviders.includes("github");
  const googleEnabled = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) && !connectedProviders.includes("google");

  if (!githubEnabled && !googleEnabled) return null;

  const label = (name: string) => (mode === "link" ? `Connect ${name}` : `Continue with ${name}`);

  return (
    <>
      <div className="flex flex-col gap-2">
        {githubEnabled && (
          <Button type="button" variant="secondary" onClick={() => startOAuthFlow("github", mode)}>
            <Github className="h-4 w-4" />
            {label("GitHub")}
          </Button>
        )}
        {googleEnabled && (
          <Button type="button" variant="secondary" onClick={() => startOAuthFlow("google", mode)}>
            <span aria-hidden className="text-sm font-semibold">
              G
            </span>
            {label("Google")}
          </Button>
        )}
      </div>
      {mode === "signin" && (
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <div className="h-px flex-1 bg-border-subtle" />
          or
          <div className="h-px flex-1 bg-border-subtle" />
        </div>
      )}
    </>
  );
}
