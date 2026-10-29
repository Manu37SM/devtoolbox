import type { ToolRegistryEntry } from "@devtoolbox/shared";
import { ToolPageEffects } from "@/components/tools/ToolPageEffects";

interface ToolShellProps {
  tool: ToolRegistryEntry;
  children: React.ReactNode;
}

export function ToolShell({ tool, children }: ToolShellProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-56px-3.5rem)] max-w-7xl flex-col px-4 py-4 sm:px-6 sm:py-6 lg:h-[calc(100vh-56px)] lg:min-h-0">
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
