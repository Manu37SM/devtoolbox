"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function NewSnippetPage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const [toolSlug, setToolSlug] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await apiPost<{ id: string }>(
        "/snippets",
        { toolSlug: toolSlug || "untitled", title, content, isPublic },
        { authenticated: true },
      );
      router.push(`/snippets/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't save. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (status !== "authenticated") {
    return <div className="mx-auto max-w-2xl px-6 py-12 text-sm text-text-secondary">Loading…</div>;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <h1 className="text-xl font-semibold text-text-primary">New snippet</h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm text-text-primary">
          Title
          <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-text-primary">
          Tool slug (which tool this came from — optional)
          <Input
            placeholder="e.g. json-formatter"
            value={toolSlug}
            onChange={(e) => setToolSlug(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-text-primary">
          Content
          <Textarea
            required
            className="h-64"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="h-4 w-4 rounded-sm border-border-default"
          />
          Make this snippet public (anyone with the link can view it)
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}

        <Button type="submit" disabled={submitting} className="self-start">
          {submitting ? "Saving…" : "Save snippet"}
        </Button>
      </form>
    </div>
  );
}
