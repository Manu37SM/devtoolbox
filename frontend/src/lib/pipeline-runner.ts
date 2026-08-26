

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

    finalOutput: steps.length === 0 ? initialInput : (lastResult?.output ?? initialInput),
  };
}
