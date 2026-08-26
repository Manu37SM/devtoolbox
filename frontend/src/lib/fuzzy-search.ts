import type { ToolRegistryEntry } from "@devtoolbox/shared";

export function searchTools(tools: ToolRegistryEntry[], query: string): ToolRegistryEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return tools;

  const scored = tools
    .map((tool) => ({ tool, score: scoreTool(tool, q) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((s) => s.tool);
}

function scoreTool(tool: ToolRegistryEntry, q: string): number {
  const name = tool.name.toLowerCase();
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;
  if (tool.aliases.some((a) => a.toLowerCase().includes(q))) return 40;
  if (tool.description.toLowerCase().includes(q)) return 20;
  return 0;
}
