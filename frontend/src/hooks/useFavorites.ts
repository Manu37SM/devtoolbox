"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, toggleFavorite } from "@/lib/db";
import { getToolBySlug } from "@/lib/registry";
import type { ToolRegistryEntry } from "@devtoolbox/shared";

export function useFavoriteSlugs(): Set<string> {
  const favorites = useLiveQuery(async () => {
    if (!db) return [];
    const rows = await db.favorites.toArray();
    return rows.map((r) => r.toolSlug);
  }, []);
  return new Set(favorites ?? []);
}

export function useFavoriteTools(): ToolRegistryEntry[] {
  const slugs = useFavoriteSlugs();
  return Array.from(slugs)
    .map(getToolBySlug)
    .filter((t): t is ToolRegistryEntry => t !== undefined);
}

export { toggleFavorite };
