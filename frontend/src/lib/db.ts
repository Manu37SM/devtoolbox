import Dexie, { type EntityTable } from "dexie";

export interface HistoryEntry {
  id?: number;
  toolSlug: string;
  visitedAt: number;
}

export interface FavoriteEntry {
  toolSlug: string;
  pinnedAt: number;
}

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

  syncedId?: string;
  syncedUpdatedAt?: string;
}

class DevToolboxDatabase extends Dexie {
  history!: EntityTable<HistoryEntry, "id">;
  favorites!: EntityTable<FavoriteEntry, "toolSlug">;
  pipelines!: EntityTable<PipelineRecord, "id">;

  constructor() {
    super("devtoolbox");
    this.version(1).stores({

      history: "++id, toolSlug, visitedAt",
      favorites: "toolSlug, pinnedAt",
    });

    this.version(2).stores({
      history: "++id, toolSlug, visitedAt",
      favorites: "toolSlug, pinnedAt",

      pipelines: "++id, updatedAt",
    });
  }
}

export const db = typeof window !== "undefined" ? new DevToolboxDatabase() : (null as unknown as DevToolboxDatabase);

const MAX_HISTORY_ENTRIES = 200;

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

export async function createPipeline(
  data: Pick<PipelineRecord, "name" | "description" | "steps">,
): Promise<number> {
  if (!db) return -1;
  const now = Date.now();

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
