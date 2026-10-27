import { dump as dumpYaml, load as loadYaml } from "js-yaml";
import { parse as parseToml, stringify as stringifyToml } from "smol-toml";
import type { TransformResult } from "@/lib/tool-transform";
import type { YamlTomlOptions } from "./schema";

function findNull(value: unknown, path: string): string | null {
  if (value === null || value === undefined) return path || "(root)";
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = findNull(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
  } else if (typeof value === "object" && !(value instanceof Date)) {
    for (const [k, v] of Object.entries(value)) {
      const hit = findNull(v, path ? `${path}.${k}` : k);
      if (hit) return hit;
    }
  }
  return null;
}

export function convertYamlToml(input: string, options: YamlTomlOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };
  try {
    if (options.mode === "yaml-to-toml") {
      const parsed = loadYaml(input);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return { output: "", error: { message: "TOML needs a mapping at the top level." } };
      }
      const nullPath = findNull(parsed, "");
      if (nullPath) {
        return { output: "", error: { message: `TOML has no null value — "${nullPath}" is null in the YAML. Remove it or give it a value.` } };
      }
      return { output: stringifyToml(parsed as Record<string, unknown>), error: null };
    }
    const parsed = parseToml(input);
    return { output: dumpYaml(parsed, { indent: Number(options.indent), lineWidth: -1, noRefs: true }), error: null };
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "Conversion failed." } };
  }
}
