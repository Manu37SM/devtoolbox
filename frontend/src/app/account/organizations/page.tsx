"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { OrganizationSummary } from "@devtoolbox/shared";
import { apiGet, apiPost, ApiClientError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function OrganizationsPage() {
  const router = useRouter();
  const { status } = useAuthStore();
  const [orgs, setOrgs] = useState<OrganizationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    apiGet<OrganizationSummary[]>("/organizations", { authenticated: true })
      .then(setOrgs)
      .catch(() => setOrgs([]));
  }, [status]);

  async function onCreate() {
    setError(null);
    setCreating(true);
    try {
      const created = await apiPost<OrganizationSummary>(
        "/organizations",
        { name: newOrgName },
        { authenticated: true },
      );
      setOrgs((prev) => [...(prev ?? []), created]);
      setNewOrgName("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't create the organization. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Team workspaces</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Shared snippets, shared pipelines, and a pooled AI-usage dashboard for your team. Members of an
          organization whose owner is on the TEAM plan get TEAM-tier AI quotas too.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        {orgs === null ? (
          <p className="text-sm text-text-secondary">Loading…</p>
        ) : orgs.length === 0 ? (
          <p className="text-sm text-text-secondary">You&apos;re not part of any organization yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {orgs.map((org) => (
              <li key={org.id}>
                <Link
                  href={`/account/organizations/${org.id}`}
                  className="flex items-center justify-between rounded-md border border-border-default px-3 py-2 text-sm hover:border-accent/60"
                >
                  <span className="text-text-primary">{org.name}</span>
                  <Badge variant="neutral">{org.role}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex gap-2">
          <Input
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            placeholder="Organization name"
            className="max-w-56"
          />
          <Button size="sm" onClick={onCreate} disabled={creating || !newOrgName.trim()}>
            {creating ? "Creating…" : "Create organization"}
          </Button>
        </div>
      </section>

      <Link href="/account" className="text-sm text-text-secondary hover:text-text-primary hover:underline">
        ← Back to account
      </Link>
    </div>
  );
}
