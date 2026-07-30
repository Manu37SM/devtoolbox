import Dexie, { type EntityTable } from "dexie";

// Local-first data model per ARCHITECTURE.md's "IndexedDB, no accounts
// required for MVP" decision (AUDIT_REPORT.md §2) and DEVELOPMENT_GUIDE.md
// §3 (`store/` for Zustand, but persistent per-tool data lives here via
// Dexie). Two tables for now: recent-tool history and favorites/pinning —
// both P0 cross-cutting features per FEATURE.md.

export interface HistoryEntry {
  id?: number;
  toolSlug: string;
  visitedAt: number; // epoch ms
}

export interface FavoriteEntry {
  toolSlug: string; // primary key
  pinnedAt: number; // epoch ms
}

class DevToolboxDatabase extends Dexie {
  history!: EntityTable<HistoryEntry, "id">;
  favorites!: EntityTable<FavoriteEntry, "toolSlug">;

  constructor() {
    super("devtoolbox");
    this.version(1).stores({
      // toolSlug indexed for "most recent visit per tool" queries;
      // visitedAt indexed for "recent N across all tools" queries.
      history: "++id, toolSlug, visitedAt",
      favorites: "toolSlug, pinnedAt",
    });
  }
}

// Lazily constructed so this module is safe to import from code that
// might run during SSR/build (Dexie itself no-ops without IndexedDB, but
// we avoid touching it outside the browser entirely).
export const db = typeof window !== "undefined" ? new DevToolboxDatabase() : (null as unknown as DevToolboxDatabase);

const MAX_HISTORY_ENTRIES = 200;

/** Records a tool visit. Trims history to the most recent N entries so
 * IndexedDB doesn't grow unbounded for long-lived sessions. */
export async function recordToolVisit(toolSlug: string): Promise<void> {
  if (!db) return;
  await db.history.add({ toolSlug, visitedAt: Date.now() });

  const count = await db.history.count();
  if (count > MAX_HISTORY_ENTRIES) {
    const overflow = count - MAX_HISTORY_ENTRIES;
    const oldest = await db.history.orderBy("visitedAt").limit(overflow).primaryKeys();
    await db.history.bulkDelete(oldest);
  }
}

export async function toggleFavorite(toolSlug: string): Promise<boolean> {
  if (!db) return false;
  const existing = await db.favorites.get(toolSlug);
  if (existing) {
    await db.favorites.delete(toolSlug);
    return false;
  }
  await db.favorites.put({ toolSlug, pinnedAt: Date.now() });
  return true;
}
