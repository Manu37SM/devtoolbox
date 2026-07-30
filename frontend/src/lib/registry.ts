// Single source of truth for the tool catalog: powers the command palette,
// sitemap.xml, /tools index page, and related-tools linking. See
// DEVELOPMENT_GUIDE.md §5 — every new tool's `index.ts` gets registered here.
//
// This file currently contains only the reference tool used to validate the
// tool contract during planning. Populate it as Phase 1 (MVP) tools ship,
// per FEATURE.md's Phased Roadmap.

import type { ToolRegistryEntry } from "@devtoolbox/shared";
import { jsonFormatterTool } from "@/modules/tools/data-format/json-formatter";

export const toolRegistry: ToolRegistryEntry[] = [jsonFormatterTool];

export function getToolBySlug(slug: string): ToolRegistryEntry | undefined {
  return toolRegistry.find((tool) => tool.slug === slug);
}

export function getToolsByModule(module: ToolRegistryEntry["module"]): ToolRegistryEntry[] {
  return toolRegistry.filter((tool) => tool.module === module);
}
