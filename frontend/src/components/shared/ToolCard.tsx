import Link from "next/link";
import type { ToolRegistryEntry } from "@devtoolbox/shared";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { AiBadge } from "@/components/shared/AiBadge";
import { isAiTool } from "@/lib/tiers";

export function ToolCard({ tool }: { tool: ToolRegistryEntry }) {
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group flex items-start gap-3 rounded-md border border-border-subtle bg-bg-raised p-3.5 transition-colors duration-fast hover:border-accent"
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-bg-base text-text-secondary group-hover:text-accent">
        <DynamicIcon name={tool.icon} className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium text-text-primary">{tool.name}</span>
          {isAiTool(tool) && <AiBadge />}
        </span>
        <span className="mt-0.5 line-clamp-2 block text-sm text-text-muted">{tool.description}</span>
      </span>
    </Link>
  );
}
