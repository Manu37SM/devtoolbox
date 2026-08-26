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
