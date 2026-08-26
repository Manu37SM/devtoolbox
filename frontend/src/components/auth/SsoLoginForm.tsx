"use client";

import { useState, type FormEvent } from "react";
import type { SsoDiscoveryResult } from "@devtoolbox/shared";
import { apiGet, ApiClientError } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SsoLoginForm() {
  const [expanded, setExpanded] = useState(false);
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const cleanDomain = domain.trim().replace(/^@/, "").toLowerCase();
      const discovery = await apiGet<SsoDiscoveryResult>(`/sso/discover?domain=${encodeURIComponent(cleanDomain)}`);
      if (!discovery.available) {
        setError("No SSO connection is configured for that domain.");
        return;
      }

      if (discovery.protocol === "OIDC") {
        const redirectUri = `${window.location.origin}/sso/callback`;
        const { url } = await apiGet<{ url: string }>(
          `/sso/oidc/authorize?domain=${encodeURIComponent(cleanDomain)}&redirectUri=${encodeURIComponent(redirectUri)}`,
        );
        window.location.assign(url);
        return;
      }

      const { url } = await apiGet<{ url: string }>(`/sso/saml/authorize?domain=${encodeURIComponent(cleanDomain)}`);
      window.location.assign(url);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't start SSO sign-in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-sm text-text-secondary hover:text-text-primary hover:underline"
      >
        Sign in with SSO instead
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm text-text-primary">
        Work email domain
        <Input
          type="text"
          required
          placeholder="acme.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" variant="secondary" disabled={submitting || !domain.trim()}>
        {submitting ? "Checking…" : "Continue with SSO"}
      </Button>
    </form>
  );
}
