import type { ToolModule } from "@devtoolbox/shared";
import { getToolBySlug } from "@/lib/registry";
import { MODULE_ORDER } from "@/lib/module-meta";

/** Which category a URL belongs to, so the sidebar can open it automatically. */
export function moduleForPath(pathname: string): ToolModule | null {
  const tool = /^\/tools\/([^/]+)/.exec(pathname);
  if (tool) return getToolBySlug(tool[1]!)?.module ?? null;
  const cat = /^\/category\/([^/]+)/.exec(pathname);
  if (cat && (MODULE_ORDER as string[]).includes(cat[1]!)) return cat[1] as ToolModule;
  return null;
}
