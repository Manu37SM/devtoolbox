"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { ToolRegistryEntry } from "@devtoolbox/shared";
import { ToolCard } from "@/components/shared/ToolCard";
import { filterTools } from "@/lib/tool-filter";

export function CategoryToolList({ tools, label }: { tools: ToolRegistryEntry[]; label: string }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => filterTools(tools, query), [tools, query]);

  return (
    <div>
      <label className="relative block max-w-md">
        <span className="sr-only">Filter {label} tools</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Filter ${tools.length} tools…`}
          className="w-full rounded-sm border border-border-default bg-bg-raised py-2 pl-9 pr-3 text-sm"
        />
      </label>
      <p className="mt-3 text-sm text-text-muted" aria-live="polite">
        {shown.length === tools.length ? `${tools.length} tools` : `${shown.length} of ${tools.length} tools`}
      </p>
      {shown.length === 0 ? (
        <p className="mt-6 text-text-secondary">No tools match “{query}”.</p>
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}
