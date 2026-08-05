import type { CreateSyncedPipelineDto } from "@devtoolbox/shared";
import { apiGet, apiPatch, apiPost, ApiClientError } from "@/lib/api-client";
import { db, type PipelineRecord } from "@/lib/db";

interface SyncedPipeline {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  steps: Array<{ order: number; toolSlug: string; optionsJson: Record<string, unknown> }>;
}

export class PipelineConflictError extends Error {
  serverUpdatedAt: string;
  constructor(serverUpdatedAt: string) {
    super("The account version of this pipeline has changed since you last synced it.");
    this.serverUpdatedAt = serverUpdatedAt;
  }
}

function toDto(local: PipelineRecord): CreateSyncedPipelineDto {
  return {
    name: local.name,
    description: local.description,
    steps: local.steps.map((s) => ({ toolSlug: s.toolSlug, optionsJson: s.optionsJson })),
  };
}

/**
 * Pushes a local pipeline to the signed-in user's account — creates a new
 * server pipeline the first time (records `syncedId`), updates it on
 * subsequent pushes. Before updating, re-fetches the server copy's
 * `updatedAt` and compares it against what we recorded at the last
 * successful sync (`syncedUpdatedAt`): if they don't match, someone/
 * something changed the server copy since we last saw it (another device,
 * a duplicate, etc.) and this throws `PipelineConflictError` instead of
 * silently overwriting — the caller (PipelineBuilder) shows a confirm
 * prompt and can retry with `force: true`. This is the "user-visible
 * conflict prompt for pipelines" DATABASE.md §7 calls for; it's
 * last-write-wins once the user confirms, not a real merge.
 */
export async function pushPipelineToAccount(
  local: PipelineRecord,
  opts: { force?: boolean } = {},
): Promise<{ syncedId: string; syncedUpdatedAt: string }> {
  if (!db || local.id === undefined) throw new Error("Pipeline must be saved locally first.");

  if (!local.syncedId) {
    const created = await apiPost<SyncedPipeline>("/pipelines", toDto(local), { authenticated: true });
    await db.pipelines.update(local.id, { syncedId: created.id, syncedUpdatedAt: created.updatedAt });
    return { syncedId: created.id, syncedUpdatedAt: created.updatedAt };
  }

  if (!opts.force) {
    const current = await apiGet<SyncedPipeline>(`/pipelines/${local.syncedId}`, { authenticated: true }).catch(
      (err) => {
        // Deleted server-side since we last synced — treat like "never synced".
        if (err instanceof ApiClientError && err.status === 404) return null;
        throw err;
      },
    );
    if (current && current.updatedAt !== local.syncedUpdatedAt) {
      throw new PipelineConflictError(current.updatedAt);
    }
  }

  const updated = await apiPatch<SyncedPipeline>(`/pipelines/${local.syncedId}`, toDto(local), {
    authenticated: true,
  });
  await db.pipelines.update(local.id, { syncedId: updated.id, syncedUpdatedAt: updated.updatedAt });
  return { syncedId: updated.id, syncedUpdatedAt: updated.updatedAt };
}
