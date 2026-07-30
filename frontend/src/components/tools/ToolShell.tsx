import type { ToolRegistryEntry } from "@devtoolbox/shared";
import { ToolPageEffects } from "@/components/tools/ToolPageEffects";

interface ToolShellProps {
  tool: ToolRegistryEntry;
  children: React.ReactNode;
}

/** Page-level layout wrapper every tool page uses: title, description,
 * then the tool's own input/output/options content. Per UI_GUIDELINES.md
 * §4, no tool builds a bespoke top-level layout — this is the only place
 * that owns title/description chrome. Stays a server component itself;
 * the history-recording + favorite-toggle behavior lives in the
 * client-only <ToolPageEffects> child. */
export function ToolShell({ tool, children }: ToolShellProps) {
  return (
    <div className="mx-auto flex h-[calc(100vh-56px)] max-w-7xl flex-col px-6 py-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{tool.name}</h1>
          <p className="mt-1 text-sm text-text-muted">{tool.description}</p>
        </div>
        <ToolPageEffects toolSlug={tool.slug} />
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
