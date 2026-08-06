import type { AiGenerateResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";
import type { GenerateFromExampleOptions } from "./schema";

/** Composes onto the existing POST /ai/generate endpoint (same one nl-to-cron
 * and nl-to-regex use) rather than adding a new backend route — per
 * CLAUDE.md's "compose, don't rebuild." The difference from nl-to-regex is
 * that this tool is driven purely by example data with no natural-language
 * description, so a fixed instruction stands in for the `prompt` field:
 * - target "regex": the pasted lines become the `examples` array (same as
 *   nl-to-regex), and the fixed instruction tells the model to infer the
 *   pattern from them alone.
 * - target "json-schema": there's no natural place for a whole JSON
 *   document in the 500-char-per-item `examples` array, so the sample is
 *   folded into `prompt` instead (raised to a 4_000-char ceiling in
 *   AiGenerateSchema for exactly this case).
 */
export async function generateFromExample(options: GenerateFromExampleOptions): Promise<AiGenerateResult> {
  if (options.target === "regex") {
    const examples = options.sample
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 10);
    return apiPost<AiGenerateResult>("/ai/generate", {
      target: "regex",
      prompt: "Infer a regular expression purely from the example strings below — do not assume any description beyond what they show.",
      examples,
    });
  }

  return apiPost<AiGenerateResult>("/ai/generate", {
    target: "json-schema",
    prompt: `Infer a JSON Schema purely from this sample JSON document — do not assume any description beyond what it shows:\n${options.sample}`,
  });
}
