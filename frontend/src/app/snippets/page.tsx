"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FileText } from "lucide-react";
import { apiGet, ApiClientError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { Badge } from "@/components/ui/badge";

interface SnippetSummary {
  id: string;
  toolSlug: string;
  title: string;
  isPublic: boolean;
  createdAt: string;
}

interface SnippetsPage {
  items: SnippetSummary[];
  nextCursor: string | null;
}

// Server-synced snippets — API.md §6. Signed-in only (list/create are
// always scoped to the caller; a *specific* snippet page can be public,
// see /snippets/[id]), same account-required pattern as /account.
export default function SnippetsPage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const [snippets, setSnippets] = useState<SnippetSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    apiGet<SnippetsPage>("/snippets", { authenticated: true })
      .then((res) => {
        setSnippets(res.items);
        setCursor(res.nextCursor);
      })
      .catch((err) => setError(err instanceof ApiClientError ? err.message : "Couldn't load snippets."))
      .finally(() => setLoading(false));
  }, [status]);

  async function loadMore() {
    if (!cursor) return;
    const res = await apiGet<SnippetsPage>(`/snippets?cursor=${encodeURIComponent(cursor)}`, {
      authenticated: true,
    });
    setSnippets((prev) => [...prev, ...res.items]);
    setCursor(res.nextCursor);
  }

  if (status !== "authenticated") {
    return <div className="mx-auto max-w-5xl px-6 py-12 text-sm text-text-secondary">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Snippets</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            Save and optionally share text or code from any tool. Synced to your account.
          </p>
        </div>
        <Link
          href="/snippets/new"
          className="inline-flex h-9 min-w-[44px] items-center justify-center gap-1.5 rounded-sm bg-accent px-3 text-sm font-medium text-accent-foreground transition-colors duration-fast hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New snippet
        </Link>
      </div>

      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : error ? (
          <p className="text-sm text-danger">{error}</p>
        ) : snippets.length === 0 ? (
          <div className="rounded-md border border-dashed border-border-subtle p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-text-muted" />
            <p className="mt-3 text-text-secondary">No snippets yet.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {snippets.map((snippet) => (
                <Link
                  key={snippet.id}
                  href={`/snippets/${snippet.id}`}
                  className="rounded-md border border-border-subtle bg-bg-raised p-4 transition-colors duration-fast hover:border-accent"
                >
                  <div className="font-medium text-text-primary">{snippet.title}</div>
                  <div className="mt-1 text-sm text-text-muted">{snippet.toolSlug}</div>
                  <div className="mt-3 flex gap-2">
                    <Badge variant="neutral">{snippet.isPublic ? "Public" : "Private"}</Badge>
                  </div>
                </Link>
              ))}
            </div>
            {cursor && (
              <button
                type="button"
                onClick={loadMore}
                className="mt-6 text-sm text-accent hover:underline"
              >
                Load more
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
