"use client";

import { useEffect, useState } from "react";
import type { OrganizationSummary, ShareLinkResult } from "@devtoolbox/shared";
import { apiGet, apiPost, ApiClientError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";

interface ShareButtonProps {
  toolSlug: string;

  getPayload: () => Record<string, unknown> | null;

  disabledHint?: string;
}

export function ShareButton({ toolSlug, getPayload, disabledHint }: ShareButtonProps) {
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated");
  const [open, setOpen] = useState(false);
  const [orgs, setOrgs] = useState<OrganizationSummary[] | null>(null);
  const [organizationId, setOrganizationId] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<ShareLinkResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !isAuthenticated || orgs !== null) return;
    apiGet<OrganizationSummary[]>("/organizations", { authenticated: true })
      .then(setOrgs)
      .catch(() => setOrgs([]));
  }, [open, isAuthenticated, orgs]);

  async function onCreate() {
    const payload = getPayload();
    if (!payload) return;
    setError(null);
    setCreating(true);
    setResult(null);
    try {
      const link = await apiPost<ShareLinkResult>(
        "/shares",
        { toolSlug, payload, ...(organizationId ? { organizationId } : {}) },
        { authenticated: true },
      );
      setResult(link);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't create a share link. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function onCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2_000);
  }

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Share
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border-default bg-bg-raised p-3 text-sm">
      {!result ? (
        <>
          {orgs && orgs.length > 0 && (
            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Share as
              <select
                className="rounded-sm border border-border-default bg-bg-overlay px-2 py-1.5 text-sm text-text-primary"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
              >
                <option value="">Just me (default DevToolbox branding)</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                    {org.brandName ? " (branded)" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onCreate} disabled={creating || !getPayload()}>
              {creating ? "Creating…" : "Create link"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          {!getPayload() && disabledHint && <p className="text-xs text-text-muted">{disabledHint}</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={result.url}
              className="flex-1 rounded-sm border border-border-default bg-bg-overlay px-2 py-1.5 text-xs text-text-primary"
              onFocus={(e) => e.target.select()}
            />
            <Button size="sm" onClick={onCopy}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <p className="text-xs text-text-muted">
            Expires {result.expiresAt ? new Date(result.expiresAt).toLocaleDateString() : "never"}.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => {
              setResult(null);
              setOpen(false);
            }}
          >
            Done
          </Button>
        </>
      )}
    </div>
  );
}
