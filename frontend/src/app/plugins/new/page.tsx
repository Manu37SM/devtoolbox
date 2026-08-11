"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { PluginSummary } from "@devtoolbox/shared";
import { apiPost, ApiClientError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function NewPluginPage() {
  const router = useRouter();
  const { status } = useAuthStore();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  async function onCreate() {
    setError(null);
    setCreating(true);
    try {
      const created = await apiPost<PluginSummary>(
        "/plugins",
        { slug, name, description },
        { authenticated: true },
      );
      router.push(`/plugins/${created.slug}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't create the plugin. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-16">
      <h1 className="text-xl font-semibold text-text-primary">Submit a plugin</h1>
      <p className="text-sm text-text-secondary">
        Creates a draft. You&apos;ll submit a WASM version next, which goes into review before it&apos;s listed.
      </p>

      <label className="flex flex-col gap-1.5 text-sm text-text-primary">
        Slug (lowercase, hyphens only)
        <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-cool-tool" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-text-primary">
        Name
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Cool Tool" />
      </label>
      <label className="flex flex-col gap-1.5 text-sm text-text-primary">
        Description
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What it does" />
      </label>

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button
        size="sm"
        className="self-start"
        onClick={onCreate}
        disabled={creating || !slug.trim() || !name.trim() || !description.trim()}
      >
        {creating ? "Creating…" : "Create draft"}
      </Button>

      <Link href="/plugins" className="text-sm text-text-secondary hover:text-text-primary hover:underline">
        ← Back to plugins
      </Link>
    </div>
  );
}
