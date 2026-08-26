import type { AiGenerateResult } from "@devtoolbox/shared";
import { apiPost } from "@/lib/api-client";
import type { GenerateFromExampleOptions } from "./schema";

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
