"use client";

import { use } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { PipelineBuilder } from "@/components/pipelines/PipelineBuilder";

interface PipelineEditPageProps {
  params: Promise<{ id: string }>;
}

// Edit/run an existing pipeline. Dexie/IndexedDB is browser-only, so this
// route is a client component (matches how favorites/history hooks read
// via `useLiveQuery` rather than a server-side loader) — see
// hooks/useFavorites.ts and hooks/useLocalHistory.ts for the pattern.
export default function PipelineEditPage({ params }: PipelineEditPageProps) {
  const { id } = use(params);
  const numericId = Number(id);

  const pipeline = useLiveQuery(async () => {
    if (!db || Number.isNaN(numericId)) return null;
    const record = await db.pipelines.get(numericId);
    return record ?? null;
  }, [numericId]);

  if (pipeline === undefined) {
    return <div className="mx-auto max-w-4xl px-6 py-8 text-sm text-text-muted">Loading…</div>;
  }

  if (pipeline === null) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-8">
        <p className="text-text-secondary">Pipeline not found.</p>
        <Link href="/pipelines" className="mt-2 inline-block text-sm text-accent hover:underline">
          Back to pipelines
        </Link>
      </div>
    );
  }

  return <PipelineBuilder pipeline={pipeline} />;
}
