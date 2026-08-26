import { apiGet, apiPost } from "@/lib/api-client";
import { db } from "@/lib/db";

interface ServerFavorite {
  id: string;
  toolSlug: string;
  createdAt: string;
}

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
