"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { ShareLinkView } from "@devtoolbox/shared";
import { apiGet, ApiClientError } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";

interface SharePageProps {
  params: Promise<{ slug: string }>;
}

/** Public share-link viewer — API.md §8, first frontend consumer of the
 * Share Links backend module (AUDIT_REPORT.md §22, which also added the
 * `branding` field this page renders). No auth required; `GET /shares/:slug`
 * is a public route. Payload shape varies by `toolSlug` — this renders a
 * couple of known shapes specially (pipelines, snippet-like
 * title/content pairs) and falls back to a generic key/value dump for
 * anything else, since instrumenting all 60+ individual tools to produce
 * a bespoke share view is out of scope for this pass. */
export default function SharePage({ params }: SharePageProps) {
  const { slug } = use(params);
  const [view, setView] = useState<ShareLinkView | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<ShareLinkView>(`/shares/${slug}`)
      .then(setView)
      .catch((err) => {
        setView(null);
        setError(err instanceof ApiClientError ? err.message : "This share link doesn't exist or has expired.");
      });
  }, [slug]);

  if (view === undefined) {
    return <div className="mx-auto max-w-2xl px-6 py-12 text-sm text-text-secondary">Loading…</div>;
  }

  if (view === null) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-sm text-danger">{error}</p>
        <Link href="/" className="mt-2 inline-block text-sm text-accent hover:underline">
          ← DevToolbox home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
      <BrandingBanner branding={view.branding} />

      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-text-primary">Shared {formatToolLabel(view.toolSlug)}</h1>
          <Badge variant="neutral">{new Date(view.createdAt).toLocaleDateString()}</Badge>
        </div>
      </div>

      <SharedContent view={view} />

      <Link href="/" className="text-sm text-accent hover:underline">
        Open DevToolbox →
      </Link>
    </div>
  );
}

function formatToolLabel(toolSlug: string): string {
  if (toolSlug === "pipeline") return "pipeline";
  return toolSlug.replace(/-/g, " ");
}

function BrandingBanner({ branding }: { branding: ShareLinkView["branding"] }) {
  if (!branding) {
    return <p className="text-xs text-text-muted">Shared via DevToolbox</p>;
  }
  return (
    <div className="flex items-center gap-2 border-b border-border-default pb-3">
      {branding.logoUrl && (
        // Org-supplied URL, not fetched/verified server-side (schema.prisma's
        // Organization.brandLogoUrl comment) — same trust tier as
        // User.avatarUrl elsewhere in this codebase.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={branding.logoUrl} alt="" className="h-6 w-6 rounded-sm object-contain" />
      )}
      <span className="text-sm font-medium text-text-primary">{branding.name}</span>
      <span className="text-xs text-text-muted">via DevToolbox</span>
    </div>
  );
}

function SharedContent({ view }: { view: ShareLinkView }) {
  const { payload, toolSlug } = view;

  if (toolSlug === "pipeline" && Array.isArray(payload.steps)) {
    const steps = payload.steps as { toolSlug: string }[];
    return (
      <div className="flex flex-col gap-2">
        {typeof payload.name === "string" && payload.name && (
          <p className="text-sm font-medium text-text-primary">{payload.name}</p>
        )}
        {typeof payload.description === "string" && payload.description && (
          <p className="text-sm text-text-secondary">{payload.description}</p>
        )}
        <ol className="flex flex-col gap-1">
          {steps.map((step, i) => (
            <li key={i} className="rounded-md border border-border-subtle bg-bg-raised px-3 py-2 text-sm">
              {i + 1}. {step.toolSlug}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  if (typeof payload.content === "string") {
    return (
      <pre className="overflow-auto rounded-md border border-border-default bg-bg-raised p-4 text-sm">
        {payload.content}
      </pre>
    );
  }

  return (
    <pre className="overflow-auto rounded-md border border-border-default bg-bg-raised p-4 text-xs">
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
}
