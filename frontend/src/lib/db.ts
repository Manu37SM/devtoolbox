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

// Pipelines (Phase 2, P1 — FEATURE.md "Pipelines (chain tools, client-only)").
// `PipelineStepRecord` is deliberately field-compatible with
// `PipelineStepDto` (packages/shared/src/index.ts's `PipelineStepSchema`)
// so a future backend sync (Phase 3) doesn't require a rename — see
// CLAUDE.md rule 10 on not inventing new shapes silently.
export interface PipelineStepRecord {
  toolSlug: string;
  optionsJson: Record<string, unknown>;
}

export interface PipelineRecord {
  id?: number;
  name: string;
  description?: string;
  steps: PipelineStepRecord[];
  createdAt: number;
  updatedAt: number;
}

class DevToolboxDatabase extends Dexie {
  history!: EntityTable<HistoryEntry, "id">;
  favorites!: EntityTable<FavoriteEntry, "toolSlug">;
  pipelines!: EntityTable<PipelineRecord, "id">;

  constructor() {
    super("devtoolbox");
    this.version(1).stores({
      // toolSlug indexed for "most recent visit per tool" queries;
      // visitedAt indexed for "recent N across all tools" queries.
      history: "++id, toolSlug, visitedAt",
      favorites: "toolSlug, pinnedAt",
    });
    // v2 adds the `pipelines` table (Phase 2). Dexie requires the full
    // schema (old + new tables) repeated per version — the `version(1)`
    // block above is left untouched per Dexie's versioning API.
    this.version(2).stores({
      history: "++id, toolSlug, visitedAt",
      favorites: "toolSlug, pinnedAt",
      // updatedAt indexed for "most recently edited pipelines first" listing.
      pipelines: "++id, updatedAt",
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

// ── Pipelines CRUD ──────────────────────────────────────────────────────
// Components read the list via `useLiveQuery(() => db.pipelines...)`
// directly (see useFavorites.ts/useLocalHistory.ts for the established
// pattern) — these helpers cover the write side only.

export async function createPipeline(
  data: Pick<PipelineRecord, "name" | "description" | "steps">,
): Promise<number> {
  if (!db) return -1;
  const now = Date.now();
  // Dexie infers `add()`'s resolved type from the PK field's own type
  // (`PipelineRecord["id"]`, which is `number | undefined` since `id` is
  // optional pre-insert), not from the actual runtime guarantee that a
  // successful add on an auto-increment table always resolves to the new
  // numeric key — hence the assertion.
  const id = await db.pipelines.add({ ...data, createdAt: now, updatedAt: now });
  return id as number;
}

export async function updatePipeline(
  id: number,
  data: Partial<Pick<PipelineRecord, "name" | "description" | "steps">>,
): Promise<void> {
  if (!db) return;
  await db.pipelines.update(id, { ...data, updatedAt: Date.now() });
}

export async function deletePipeline(id: number): Promise<void> {
  if (!db) return;
  await db.pipelines.delete(id);
}

export async function getAllPipelines(): Promise<PipelineRecord[]> {
  if (!db) return [];
  return db.pipelines.orderBy("updatedAt").reverse().toArray();
}

export async function getPipeline(id: number): Promise<PipelineRecord | undefined> {
  if (!db) return undefined;
  return db.pipelines.get(id);
}
