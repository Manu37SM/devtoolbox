import Link from "next/link";
import type { ToolRegistryEntry } from "@devtoolbox/shared";

export function ToolCard({ tool }: { tool: ToolRegistryEntry }) {
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="block rounded-md border border-border-subtle bg-bg-raised p-4 transition-colors duration-fast hover:border-accent"
    >
      <div className="font-medium text-text-primary">{tool.name}</div>
      <div className="mt-1 text-sm text-text-muted">{tool.description}</div>
    </Link>
  );
}
