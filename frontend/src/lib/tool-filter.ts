import type { ToolRegistryEntry } from "@devtoolbox/shared";

/** Case-insensitive match on name, description and aliases. Empty query returns everything. */
export function filterTools(tools: ToolRegistryEntry[], query: string): ToolRegistryEntry[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return tools;
  return tools.filter((t) => {
    const hay = `${t.name} ${t.description} ${t.aliases.join(" ")}`.toLowerCase();
    return terms.every((term) => hay.includes(term));
  });
}
