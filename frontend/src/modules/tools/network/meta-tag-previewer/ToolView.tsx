"use client";

import { useState } from "react";
import type { UrlPreviewResult } from "@devtoolbox/shared";
import { Button } from "@/components/ui/button";
import { ApiClientError } from "@/lib/api-client";
import { previewUrl } from "./transform";

const ROWS: { label: string; key: keyof UrlPreviewResult }[] = [
  { label: "Title", key: "title" },
  { label: "Description", key: "description" },
  { label: "Image", key: "image" },
  { label: "Site name", key: "siteName" },
  { label: "Favicon", key: "favicon" },
];

export function MetaTagPreviewerToolView() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UrlPreviewResult | null>(null);

  async function handlePreview() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await previewUrl({ url });
      setResult(response);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong fetching this URL.");
    } finally {
      setLoading(false);
    }
  }

  const rows = result ? ROWS.filter((row) => Boolean(result[row.key])) : [];

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-md border border-border-default bg-bg-raised px-3 py-2 text-xs text-text-muted">
        This tool sends your input to our server to fetch the result — see why in &ldquo;How it works&rdquo;
        below.
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article"
          aria-label="URL to preview"
          className="flex-1 rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm outline-none focus-visible:border-accent"
        />
        <Button onClick={handlePreview} disabled={loading || !url.trim()}>
          {loading ? "Fetching…" : "Preview"}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : result ? (
          <div className="flex flex-col gap-4">
            {/* Social-card-style visual preview mimicking Twitter/Slack link
                unfurls. tailwind.config.ts doesn't configure the line-clamp
                plugin, so the description uses a fixed max-height +
                overflow-hidden fallback instead of `line-clamp-2`. */}
            <div className="overflow-hidden rounded-md border border-border-default">
              {result.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={result.image}
                  alt=""
                  className="h-40 w-full border-b border-border-default object-cover"
                />
              )}
              <div className="flex flex-col gap-1 p-3">
                {result.siteName && (
                  <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                    {result.siteName}
                  </span>
                )}
                {result.title && (
                  <span className="text-sm font-semibold text-text-primary">{result.title}</span>
                )}
                {result.description && (
                  <span className="max-h-10 overflow-hidden text-sm text-text-secondary">
                    {result.description}
                  </span>
                )}
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-medium text-text-secondary">Raw metadata</h3>
              <div className="rounded-md border border-border-default">
                <div className="divide-y divide-border-default">
                  {rows.map((row) => (
                    <div key={row.key} className="grid grid-cols-[minmax(120px,1fr)_2fr] gap-2 px-3 py-1.5 text-sm">
                      <span className="text-text-secondary">{row.label}</span>
                      <span className="break-all font-mono text-text-primary">{String(result[row.key])}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Enter a URL above to preview its social card.</p>
        )}
      </div>
    </div>
  );
}
