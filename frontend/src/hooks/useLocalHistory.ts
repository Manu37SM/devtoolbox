"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, recordToolVisit } from "@/lib/db";
import { getToolBySlug } from "@/lib/registry";
import type { ToolRegistryEntry } from "@devtoolbox/shared";

/** Returns the N most recently visited tools (deduplicated by tool,
 * most-recent-visit-wins), backed by IndexedDB via Dexie
 * (DEVELOPMENT_GUIDE.md §3: "Local history per tool (IndexedDB)", P0). */
export function useRecentTools(limit = 8): ToolRegistryEntry[] {
  const recent = useLiveQuery(async () => {
    if (!db) return [];
    const entries = await db.history.orderBy("visitedAt").reverse().toArray();
    const seen = new Set<string>();
    const slugs: string[] = [];
    for (const entry of entries) {
      if (seen.has(entry.toolSlug)) continue;
      seen.add(entry.toolSlug);
      slugs.push(entry.toolSlug);
      if (slugs.length >= limit) break;
    }
    return slugs;
  }, [limit]);

  return (recent ?? []).map(getToolBySlug).filter((t): t is ToolRegistryEntry => t !== undefined);
}

export { recordToolVisit };
