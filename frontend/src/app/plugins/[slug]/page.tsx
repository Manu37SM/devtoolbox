"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { PluginDetail, PluginRunPayload } from "@devtoolbox/shared";
import { apiGet, apiPost, ApiClientError } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PluginRunner } from "@/components/plugins/PluginRunner";

interface PluginDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default function PluginDetailPage({ params }: PluginDetailPageProps) {
  const { slug } = use(params);
  const { status, user } = useAuthStore();

  const [plugin, setPlugin] = useState<PluginDetail | null | undefined>(undefined);
  const [runPayload, setRunPayload] = useState<PluginRunPayload | null>(null);
  const [manifestVersion, setManifestVersion] = useState("1.0.0");
  const [wasmBase64, setWasmBase64] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try {
      const detail = await apiGet<PluginDetail>(`/plugins/${slug}`, { authenticated: status === "authenticated" });
      setPlugin(detail);
    } catch {
      setPlugin(null);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, status]);

  useEffect(() => {
    if (!plugin || plugin.status !== "PUBLISHED") return;
    apiGet<PluginRunPayload>(`/plugins/${slug}/run`)
      .then(setRunPayload)
      .catch(() => setRunPayload(null));
  }, [plugin, slug]);

  async function onSubmitVersion() {
    if (!plugin) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      await apiPost(
        `/plugins/${plugin.id}/versions`,
        {
          manifest: {
            id: plugin.slug,
            name: plugin.name,
            version: manifestVersion,
            description: plugin.description,
            author: user?.email ?? "",
          },
          wasmBase64,
        },
        { authenticated: true },
      );
      setWasmBase64("");
      await load();
    } catch (err) {
      setSubmitError(err instanceof ApiClientError ? err.message : "Couldn't submit that version.");
    } finally {
      setSubmitting(false);
    }
  }

  if (plugin === undefined) {
    return <div className="mx-auto max-w-lg px-4 py-16 text-sm text-text-secondary">Loading…</div>;
  }
  if (plugin === null) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <p className="text-sm text-text-secondary">Plugin not found.</p>
        <Link href="/plugins" className="mt-2 inline-block text-sm text-accent hover:underline">
          ← Back to plugins
        </Link>
      </div>
    );
  }

  const isOwner = status === "authenticated" && user?.email === plugin.authorEmail;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-text-primary">{plugin.name}</h1>
          <Badge variant="neutral">{plugin.status}</Badge>
        </div>
        <p className="mt-2 text-sm text-text-secondary">
          {plugin.description} — by {plugin.authorEmail}
        </p>
        <Link href="/plugins" className="mt-1 inline-block text-sm text-text-secondary hover:underline">
          ← All plugins
        </Link>
      </div>

      {plugin.status === "PUBLISHED" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-text-primary">Run it</h2>
          {runPayload ? (
            <PluginRunner slug={plugin.slug} wasmBase64={runPayload.wasmBase64} />
          ) : (
            <p className="text-sm text-text-secondary">Loading sandbox…</p>
          )}
        </section>
      )}

      {isOwner && (
        <section className="flex flex-col gap-3 border-t border-border-default pt-6">
          <h2 className="text-sm font-medium text-text-primary">Submit a new version</h2>
          <p className="text-sm text-text-secondary">
            Compile your plugin to a .wasm module exporting <code>memory</code>, <code>alloc(len)</code>, and{" "}
            <code>transform(ptr, len)</code> (returns a pointer to a 4-byte length-prefixed UTF-8 result). Paste the
            base64-encoded module below, or use <code>devtoolbox plugin publish</code> from the CLI instead.
          </p>
          <label className="flex flex-col gap-1.5 text-sm text-text-primary">
            Version
            <Input value={manifestVersion} onChange={(e) => setManifestVersion(e.target.value)} placeholder="1.0.0" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-text-primary">
            WASM module (base64)
            <Textarea
              value={wasmBase64}
              onChange={(e) => setWasmBase64(e.target.value)}
              placeholder="AGFzbQEAAAA..."
              className="font-mono text-xs"
            />
          </label>
          {submitError && <p className="text-sm text-danger">{submitError}</p>}
          <Button size="sm" className="self-start" onClick={onSubmitVersion} disabled={submitting || !wasmBase64.trim()}>
            {submitting ? "Submitting…" : "Submit for review"}
          </Button>
        </section>
      )}

      <section className="flex flex-col gap-2 border-t border-border-default pt-6">
        <h2 className="text-sm font-medium text-text-primary">Versions</h2>
        <ul className="flex flex-col gap-1">
          {plugin.versions.map((v) => (
            <li key={v.id} className="flex justify-between text-sm text-text-secondary">
              <span>v{v.version}</span>
              <span className="text-xs text-text-muted">{v.reviewedAt ? "Reviewed" : "Awaiting review"}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
