"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { PluginSummary } from "@devtoolbox/shared";
import { apiGet } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PluginsPage() {
  const { status } = useAuthStore();
  const [plugins, setPlugins] = useState<PluginSummary[] | null>(null);

  useEffect(() => {
    apiGet<PluginSummary[]>("/plugins")
      .then(setPlugins)
      .catch(() => setPlugins([]));
  }, []);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Community plugins</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Community-built tools, run entirely in an isolated browser sandbox — no network access, reviewed before
            listing here.
          </p>
        </div>
        {status === "authenticated" && (
          <Link href="/plugins/new">
            <Button size="sm">Submit a plugin</Button>
          </Link>
        )}
      </div>

      {plugins === null ? (
        <p className="text-sm text-text-secondary">Loading…</p>
      ) : plugins.length === 0 ? (
        <p className="text-sm text-text-secondary">No published plugins yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {plugins.map((p) => (
            <li key={p.id}>
              <Link
                href={`/plugins/${p.slug}`}
                className="flex flex-col gap-1 rounded-md border border-border-default px-3 py-2 hover:border-accent/60"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-text-primary">{p.name}</span>
                  {p.latestVersion && <Badge variant="neutral">v{p.latestVersion}</Badge>}
                </div>
                <span className="text-xs text-text-muted">
                  {p.description} — by {p.authorEmail}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
