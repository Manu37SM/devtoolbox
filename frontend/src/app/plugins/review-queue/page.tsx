"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PluginSummary } from "@devtoolbox/shared";
import { apiGet, apiPost, ApiClientError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";

export default function PluginReviewQueuePage() {
  const router = useRouter();
  const { status } = useAuthStore();
  const [queue, setQueue] = useState<PluginSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  async function load() {
    try {
      const items = await apiGet<PluginSummary[]>("/plugins/review-queue", { authenticated: true });
      setQueue(items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't load the review queue.");
      setQueue([]);
    }
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    void load();

  }, [status]);

  async function onReview(id: string, decision: "APPROVE" | "REJECT") {
    setActioningId(id);
    try {
      await apiPost(`/plugins/${id}/review`, { decision }, { authenticated: true });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't record that decision.");
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-xl font-semibold text-text-primary">Plugin review queue</h1>
      {error && <p className="text-sm text-danger">{error}</p>}

      {queue === null ? (
        <p className="text-sm text-text-secondary">Loading…</p>
      ) : queue.length === 0 ? (
        <p className="text-sm text-text-secondary">Nothing awaiting review.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {queue.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-md border border-border-default px-3 py-2">
              <div className="flex flex-col">
                <Link href={`/plugins/${p.slug}`} className="text-sm font-medium text-text-primary hover:underline">
                  {p.name}
                </Link>
                <span className="text-xs text-text-muted">
                  v{p.latestVersion} — by {p.authorEmail}
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => onReview(p.id, "APPROVE")} disabled={actioningId === p.id}>
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onReview(p.id, "REJECT")}
                  disabled={actioningId === p.id}
                >
                  Reject
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link href="/plugins" className="text-sm text-text-secondary hover:text-text-primary hover:underline">
        ← Back to plugins
      </Link>
    </div>
  );
}
