import { apiGet, apiPost } from "@/lib/api-client";
import { db } from "@/lib/db";

interface ServerFavorite {
  id: string;
  toolSlug: string;
  createdAt: string;
}

/**
 * One-shot favorites merge on sign-in: union of local (Dexie) and server
 * favorites, pushed/pulled both ways. Per DATABASE.md §7 — "local-first
 * data ... merged (last-write-wins, user-visible conflict prompt for
 * pipelines) into the server tables on first sign-in." Favorites have no
 * real conflict shape (a toolSlug is either favorited or not), so a plain
 * union covers it; deletions aren't reconciled here (if you unfavorited
 * locally while signed out, it reappears after sync) — a known
 * simplification, not a full two-way sync engine. History is
 * intentionally NOT backfilled by this function: only new entries created
 * after sign-in get synced, to avoid a surprise bulk upload of everything
 * a user did anonymously.
 */
export async function syncFavoritesOnSignIn(): Promise<void> {
  if (!db) return;

  const [serverFavorites, localFavorites] = await Promise.all([
    apiGet<ServerFavorite[]>("/favorites", { authenticated: true }),
    db.favorites.toArray(),
  ]);

  const serverSlugs = new Set(serverFavorites.map((f) => f.toolSlug));
  const localSlugs = new Set(localFavorites.map((f) => f.toolSlug));

  const toPush = localFavorites.filter((f) => !serverSlugs.has(f.toolSlug));
  const toPull = serverFavorites.filter((f) => !localSlugs.has(f.toolSlug));

  await Promise.all(
    toPush.map((f) => apiPost<ServerFavorite>("/favorites", { toolSlug: f.toolSlug }, { authenticated: true })),
  );
  await db.favorites.bulkPut(toPull.map((f) => ({ toolSlug: f.toolSlug, pinnedAt: new Date(f.createdAt).getTime() })));
}
