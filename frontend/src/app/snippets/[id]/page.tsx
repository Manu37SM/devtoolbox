"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiDelete, apiGet, apiPatch, ApiClientError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShareButton } from "@/components/share/ShareButton";

interface Snippet {
  id: string;
  userId: string;
  toolSlug: string;
  title: string;
  content: string;
  isPublic: boolean;
  createdAt: string;
}

interface SnippetPageProps {
  params: Promise<{ id: string }>;
}

export default function SnippetPage({ params }: SnippetPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user, status } = useAuthStore();
  const [snippet, setSnippet] = useState<Snippet | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    apiGet<Snippet>(`/snippets/${id}`, { authenticated: status === "authenticated" })
      .then((res) => {
        setSnippet(res);
        setTitle(res.title);
        setContent(res.content);
        setIsPublic(res.isPublic);
      })
      .catch((err) => {
        setSnippet(null);
        setError(err instanceof ApiClientError ? err.message : "Couldn't load this snippet.");
      });
  }, [id, status]);

  const isOwner = Boolean(snippet && user && snippet.userId === user.id);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await apiPatch<Snippet>(`/snippets/${id}`, { title, content, isPublic }, { authenticated: true });
      setSnippet(updated);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!confirm(`Delete "${snippet?.title}"?`)) return;
    try {
      await apiDelete(`/snippets/${id}`, { authenticated: true });
      router.push("/snippets");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't delete. Please try again.");
    }
  }

  if (snippet === undefined) {
    return <div className="mx-auto max-w-2xl px-6 py-12 text-sm text-text-secondary">Loading…</div>;
  }

  if (snippet === null) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-sm text-danger">{error}</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 py-12">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{snippet.title}</h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-text-secondary">
            <span>{snippet.toolSlug}</span>
            <Badge variant="neutral">Public</Badge>
          </div>
        </div>
        <pre className="overflow-auto rounded-md border border-border-default bg-bg-raised p-4 text-sm">
          {snippet.content}
        </pre>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Edit snippet</h1>
        <div className="flex items-center gap-2">
          <ShareButton
            toolSlug={snippet.toolSlug}
            getPayload={() => (content.trim() ? { title, content, toolSlug: snippet.toolSlug } : null)}
          />
          <Button variant="destructive" size="sm" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>

      <label className="flex flex-col gap-1.5 text-sm text-text-primary">
        Title
        <Input value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-text-primary">
        Content
        <Textarea className="h-64" value={content} onChange={(e) => setContent(e.target.value)} />
      </label>
      <label className="flex items-center gap-2 text-sm text-text-primary">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="h-4 w-4 rounded-sm border-border-default"
        />
        Public
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button onClick={onSave} disabled={saving} className="self-start">
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
