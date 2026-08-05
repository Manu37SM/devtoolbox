"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { createPipeline, updatePipeline, type PipelineRecord, type PipelineStepRecord } from "@/lib/db";
import { getToolBySlug } from "@/lib/registry";
import { pipelineCompatibleSlugs } from "@/lib/pipeline-adapters";
import { runPipeline, type PipelineRunResult } from "@/lib/pipeline-runner";
import { pushPipelineToAccount, PipelineConflictError } from "@/lib/pipeline-sync";
import { useAuthStore } from "@/store/auth-store";
import { ApiClientError } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";

interface PipelineBuilderProps {
  /** Existing pipeline to edit, or undefined when creating a new one. */
  pipeline?: PipelineRecord;
}

const DEFAULT_FIRST_SLUG = pipelineCompatibleSlugs[0] ?? "";

/** Pipeline create/edit + run UI (Phase 2, P1). Shared between
 * /pipelines/new and /pipelines/[id] — see route pages for how each mode
 * is wired up.
 *
 * v1 limitation (documented per this feature's brief): steps always run
 * with their tool's default options — there's no per-step OptionsPanel yet.
 * Future work: let each step override its tool's options, not just chain
 * defaults. */
export function PipelineBuilder({ pipeline }: PipelineBuilderProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.status === "authenticated");
  const [name, setName] = useState(pipeline?.name ?? "");
  const [description, setDescription] = useState(pipeline?.description ?? "");
  const [steps, setSteps] = useState<PipelineStepRecord[]>(
    pipeline?.steps ?? (DEFAULT_FIRST_SLUG ? [{ toolSlug: DEFAULT_FIRST_SLUG, optionsJson: {} }] : []),
  );
  const [initialInput, setInitialInput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [runResult, setRunResult] = useState<PipelineRunResult | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  function addStep() {
    if (!DEFAULT_FIRST_SLUG) return;
    setSteps((prev) => [...prev, { toolSlug: DEFAULT_FIRST_SLUG, optionsJson: {} }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      // `index` and `target` are both validated in-bounds by the guard
      // above (0 <= target < prev.length, and index is always a valid
      // existing step's position), so these accesses can't actually be
      // undefined — `noUncheckedIndexedAccess` can't see that guarantee
      // through the array-index swap, hence the non-null assertions.
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  function setStepSlug(index: number, toolSlug: string) {
    setSteps((prev) => prev.map((step, i) => (i === index ? { toolSlug, optionsJson: {} } : step)));
  }

  async function handleRun() {
    setIsRunning(true);
    setRunResult(null);
    try {
      const result = await runPipeline(steps, initialInput);
      setRunResult(result);
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setSaveMessage("Give the pipeline a name before saving.");
      return;
    }
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const data = { name: name.trim(), description: description.trim() || undefined, steps };
      if (pipeline?.id !== undefined) {
        await updatePipeline(pipeline.id, data);
        setSaveMessage("Saved.");
      } else {
        const id = await createPipeline(data);
        setSaveMessage("Saved.");
        router.replace(`/pipelines/${id}`);
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSync(force = false) {
    if (!pipeline || pipeline.id === undefined) {
      setSyncMessage("Save this pipeline locally first.");
      return;
    }
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      await pushPipelineToAccount(pipeline, { force });
      setSyncMessage("Synced to your account.");
    } catch (err) {
      if (err instanceof PipelineConflictError) {
        // Last-write-wins once confirmed — see pipeline-sync.ts's docblock
        // and DATABASE.md §7's "user-visible conflict prompt" callout.
        const overwrite = confirm(
          "The account version of this pipeline has changed since you last synced (maybe from another device). Overwrite it with this local version?",
        );
        if (overwrite) {
          await handleSync(true);
          return;
        }
        setSyncMessage("Not synced — kept the account version.");
      } else {
        setSyncMessage(err instanceof ApiClientError ? err.message : "Couldn't sync. Please try again.");
      }
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-medium text-text-secondary" htmlFor="pipeline-name">
            Name
          </label>
          <input
            id="pipeline-name"
            className="mt-1 w-full rounded-md border border-border-default bg-bg-raised p-2 text-sm text-text-primary outline-none focus-visible:border-accent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Decode & pretty-print JSON"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-text-secondary" htmlFor="pipeline-description">
            Description <span className="text-text-muted">(optional)</span>
          </label>
          <input
            id="pipeline-description"
            className="mt-1 w-full rounded-md border border-border-default bg-bg-raised p-2 text-sm text-text-primary outline-none focus-visible:border-accent"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this pipeline is for"
          />
        </div>

        <div>
          <h2 className="text-sm font-medium text-text-secondary">Steps</h2>
          <p className="mt-1 text-xs text-text-muted">
            Each step&apos;s output feeds the next step&apos;s input. Options are left at each
            tool&apos;s defaults for now.
          </p>
          <div className="mt-2 flex flex-col gap-2">
            {steps.map((step, index) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-md border border-border-subtle bg-bg-raised p-2"
              >
                <span className="w-6 shrink-0 text-center text-xs font-medium text-text-muted">
                  {index + 1}
                </span>
                <select
                  className="flex-1 rounded-sm border border-border-default bg-bg-overlay px-2 py-1.5 text-sm text-text-primary"
                  value={step.toolSlug}
                  onChange={(e) => setStepSlug(index, e.target.value)}
                  aria-label={`Tool for step ${index + 1}`}
                >
                  {pipelineCompatibleSlugs.map((slug) => (
                    <option key={slug} value={slug}>
                      {getToolBySlug(slug)?.name ?? slug}
                    </option>
                  ))}
                </select>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move step ${index + 1} up`}
                  disabled={index === 0}
                  onClick={() => moveStep(index, -1)}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Move step ${index + 1} down`}
                  disabled={index === steps.length - 1}
                  onClick={() => moveStep(index, 1)}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove step ${index + 1}`}
                  onClick={() => removeStep(index)}
                >
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2 inline-flex items-center gap-1.5"
            onClick={addStep}
            disabled={!DEFAULT_FIRST_SLUG}
          >
            <Plus className="h-4 w-4" />
            Add step
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
          {saveMessage ? <span className="text-sm text-text-muted">{saveMessage}</span> : null}
        </div>

        {isAuthenticated && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => handleSync()} disabled={isSyncing}>
              {isSyncing ? "Syncing…" : pipeline?.syncedId ? "Push update to account" : "Save to account"}
            </Button>
            {pipeline?.syncedId ? <Badge variant="info">Synced</Badge> : null}
            {syncMessage ? <span className="text-sm text-text-muted">{syncMessage}</span> : null}
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-text-secondary" htmlFor="pipeline-input">
            Initial input
          </label>
          <div className="mt-1 h-40">
            <Textarea
              id="pipeline-input"
              value={initialInput}
              onChange={(e) => setInitialInput(e.target.value)}
              placeholder="Text fed into step 1"
            />
          </div>
        </div>

        <div>
          <Button onClick={handleRun} disabled={isRunning || steps.length === 0}>
            {isRunning ? "Running…" : "Run pipeline"}
          </Button>
        </div>

        {runResult ? (
          <div className="flex flex-col gap-4">
            <div className="h-56">
              <OutputPane
                label="Final result"
                value={runResult.finalOutput}
                error={runResult.steps[runResult.steps.length - 1]?.error?.message ?? null}
                placeholder="Final pipeline output will appear here"
              />
            </div>
            <div className="flex flex-col gap-3">
              {runResult.steps.map((stepResult, index) => (
                <div key={index} className="h-40">
                  <OutputPane
                    label={`Step ${index + 1}: ${getToolBySlug(stepResult.toolSlug)?.name ?? stepResult.toolSlug}`}
                    value={stepResult.output}
                    error={stepResult.error?.message ?? null}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
