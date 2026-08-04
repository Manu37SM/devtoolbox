"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { Plus, Trash2, Workflow } from "lucide-react";
import { db, deletePipeline, type PipelineRecord } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

// Pipelines (Phase 2, P1) list view — see FEATURE.md's Cross-Cutting
// Platform Features table. Follows the /tools catalog page's spacing/
// typography conventions (frontend/src/app/page.tsx) since there's no
// dedicated catalog-page primitive to compose yet.
export default function PipelinesPage() {
  const pipelines = useLiveQuery(async () => {
    if (!db) return [];
    return db.pipelines.orderBy("updatedAt").reverse().toArray();
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-text-primary">Pipelines</h1>
          <p className="mt-2 max-w-2xl text-text-secondary">
            Chain tools together so one tool&apos;s output feeds the next tool&apos;s input —
            entirely in your browser, nothing is sent anywhere.
          </p>
        </div>
        <Link
          href="/pipelines/new"
          className="inline-flex h-9 min-w-[44px] items-center justify-center gap-1.5 rounded-sm bg-accent px-3 text-sm font-medium text-accent-foreground transition-colors duration-fast hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          New pipeline
        </Link>
      </div>

      <div className="mt-8">
        {pipelines === undefined ? (
          <p className="text-sm text-text-muted">Loading…</p>
        ) : pipelines.length === 0 ? (
          <div className="rounded-md border border-dashed border-border-subtle p-8 text-center">
            <Workflow className="mx-auto h-8 w-8 text-text-muted" />
            <p className="mt-3 text-text-secondary">No pipelines yet.</p>
            <p className="mt-1 text-sm text-text-muted">
              Create one to chain tools like Base64 Decode → JSON Formatter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pipelines.map((pipeline) => (
              <PipelineCard key={pipeline.id} pipeline={pipeline} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PipelineCard({ pipeline }: { pipeline: PipelineRecord }) {
  return (
    <div className="group relative rounded-md border border-border-subtle bg-bg-raised p-4 transition-colors duration-fast hover:border-accent">
      <Link href={`/pipelines/${pipeline.id}`} className="block pr-8">
        <div className="font-medium text-text-primary">{pipeline.name}</div>
        {pipeline.description ? (
          <div className="mt-1 text-sm text-text-muted">{pipeline.description}</div>
        ) : null}
        <div className="mt-3">
          <Badge variant="neutral">
            {pipeline.steps.length} {pipeline.steps.length === 1 ? "step" : "steps"}
          </Badge>
        </div>
      </Link>
      <button
        type="button"
        aria-label={`Delete pipeline "${pipeline.name}"`}
        className="absolute right-3 top-3 rounded-sm p-1.5 text-text-muted opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (pipeline.id !== undefined && window.confirm(`Delete pipeline "${pipeline.name}"?`)) {
            void deletePipeline(pipeline.id);
          }
        }}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
