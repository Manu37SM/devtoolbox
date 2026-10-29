import { getToolBySlug } from "@/lib/registry";
import type { ToolRegistryEntry } from "@devtoolbox/shared";

/**
 * Hand-picked starting points shown on the home page. Curated rather than
 * usage-ranked because DevToolbox deliberately collects no per-tool analytics.
 * Slugs that no longer exist in the registry are skipped.
 */
export const FEATURED_SLUGS = [
  "json-formatter",
  "base64",
  "jwt-decoder",
  "regex-tester",
  "uuid-generator",
  "hash-generator",
  "unix-timestamp",
  "url-encode-decode",
  "json-yaml",
  "text-diff",
  "sql-formatter",
  "cron-builder",
] as const;

export function resolveFeatured(
  slugs: readonly string[],
  lookup: (slug: string) => ToolRegistryEntry | undefined = getToolBySlug,
): ToolRegistryEntry[] {
  return slugs.map(lookup).filter((t): t is ToolRegistryEntry => t !== undefined);
}
