// Pipelines (Phase 2, P1) — chains a saved pipeline's steps client-side,
// feeding each step's text output into the next step's text input. Every
// step runs through the adapter registry in `pipeline-adapters.ts`, so this
// module has zero per-tool knowledge.

import type { PipelineStepRecord } from "@/lib/db";
import { PIPELINE_COMPATIBLE_TOOLS } from "@/lib/pipeline-adapters";

export interface PipelineStepRunResult {
  toolSlug: string;
  input: string;
  output: string;
  error: { message: string } | null;
}

export interface PipelineRunResult {
  steps: PipelineStepRunResult[];
  finalOutput: string;
}

/** Runs each step in order, options left at the step's stored
 * `optionsJson` (falling back to the tool's own defaults when empty — see
 * PipelineBuilder for how steps are seeded). Stops at the first step that
 * errors so we don't run a broken transform's output through the rest of
 * the chain, but still returns every step attempted so far so the caller
 * can show exactly where the chain broke. */
export async function runPipeline(
  steps: PipelineStepRecord[],
  initialInput: string,
): Promise<PipelineRunResult> {
  const results: PipelineStepRunResult[] = [];
  let currentInput = initialInput;

  for (const step of steps) {
    const adapter = PIPELINE_COMPATIBLE_TOOLS[step.toolSlug];
    if (!adapter) {
      results.push({
        toolSlug: step.toolSlug,
        input: currentInput,
        output: "",
        error: { message: `"${step.toolSlug}" is not a pipeline-compatible tool.` },
      });
      break;
    }

    const options =
      step.optionsJson && Object.keys(step.optionsJson).length > 0
        ? step.optionsJson
        : adapter.getDefaultOptions();

    let outcome: { output: string; error: { message: string } | null };
    try {
      outcome = await adapter.run(currentInput, options);
    } catch (err) {
      outcome = {
        output: "",
        error: { message: err instanceof Error ? err.message : "Unknown error running tool." },
      };
    }

    results.push({ toolSlug: step.toolSlug, input: currentInput, output: outcome.output, error: outcome.error });

    if (outcome.error) break;
    currentInput = outcome.output;
  }

  const lastResult = results[results.length - 1];

  return {
    steps: results,
    // Empty steps -> passthrough of the initial input, unchanged. Otherwise
    // the last successful step's output (or the last error step's empty
    // output, so the UI can show the chain stopped without a final value).
    finalOutput: steps.length === 0 ? initialInput : (lastResult?.output ?? initialInput),
  };
}
