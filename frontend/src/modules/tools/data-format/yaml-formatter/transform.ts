import { loadAll, YAMLException } from "js-yaml";
import { dumpYaml } from "@/lib/yaml-dump";
import type { YamlFormatterOptions } from "./schema";

export interface YamlFormatResult {
  output: string;
  error: { message: string; line?: number; column?: number } | null;
}

export function formatYaml(input: string, options: YamlFormatterOptions): YamlFormatResult {
  if (input.trim().length === 0) return { output: "", error: null };

  try {
    // Multi-document files (Kubernetes manifests, Helm output) keep their "---" separators.
    const docs = loadAll(input);
    const output = docs.map((doc) => dumpYaml(doc, options)).join("---\n");
    return { output, error: null };
  } catch (err) {
    if (err instanceof YAMLException) {
      const mark = err.mark;
      return {
        output: "",
        error: {
          message: err.reason || err.message,
          line: mark ? mark.line + 1 : undefined,
          column: mark ? mark.column + 1 : undefined,
        },
      };
    }
    return { output: "", error: { message: err instanceof Error ? err.message : "Invalid YAML" } };
  }
}
