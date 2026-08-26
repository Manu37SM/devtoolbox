"use client";

import { Github } from "lucide-react";
import { startOAuthFlow, type OAuthFlowMode } from "@/lib/oauth";
import { Button } from "@/components/ui/button";

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
