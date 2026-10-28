import { CORE_SCHEMA, dump, loadAll, mergeTag } from "js-yaml";

const SCHEMA = CORE_SCHEMA.withTags(mergeTag);
import type { TransformResult } from "@/lib/tool-transform";
import type { YamlAnchorExpanderOptions } from "./schema";

/** Resolves anchors (&a), aliases (*a) and merge keys (<<) so every value is written out in full. */
export function expandYaml(input: string, o: YamlAnchorExpanderOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  let docs: unknown[];
  try { docs = loadAll(input, { schema: SCHEMA }); }
  catch (e) {
    const err = e as { message?: string; mark?: { line: number; column: number }; reason?: string };
    return { output: "", error: { message: (err.reason ?? err.message ?? "Invalid YAML").split("\n")[0]!, ...(err.mark ? { line: err.mark.line + 1, column: err.mark.column + 1 } : {}) } };
  }
  if (o.output === "json") {
    const sorted = (v: unknown): unknown => Array.isArray(v) ? v.map(sorted) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sorted(x)])) : v;
    const vals = docs.map((d) => (o.sortKeys ? sorted(d) : d));
    return { output: JSON.stringify(vals.length === 1 ? vals[0] : vals, null, 2), error: null };
  }
  const text = docs.map((d) => dump(d, { noRefs: true, lineWidth: -1, sortKeys: o.sortKeys })).join("---\n");
  return { output: text, error: null };
}
