"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { formatDotenv } from "./transform";
import type { DotenvFormatterOptions } from "./schema";

export function DotenvFormatterToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<DotenvFormatterOptions>({
    sortKeys: false,
    removeComments: false,
    removeEmptyLines: false,
    quoteValues: "preserve",
  });

  const result = useMemo(() => formatDotenv(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.sortKeys}
            onChange={(e) => setOptions((o) => ({ ...o, sortKeys: e.target.checked }))}
          />
          Sort keys
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.removeComments}
            onChange={(e) => setOptions((o) => ({ ...o, removeComments: e.target.checked }))}
          />
          Remove comments
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.removeEmptyLines}
            onChange={(e) => setOptions((o) => ({ ...o, removeEmptyLines: e.target.checked }))}
          />
          Remove empty lines
        </label>
        <select
          value={options.quoteValues}
          onChange={(e) =>
            setOptions((o) => ({ ...o, quoteValues: e.target.value as DotenvFormatterOptions["quoteValues"] }))
          }
          className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 text-sm"
          aria-label="Quote values"
        >
          <option value="preserve">Preserve quotes</option>
          <option value="always">Always quote</option>
          <option value="never">Never quote</option>
        </select>
      </div>

      {result.warnings.length > 0 && (
        <div role="alert" className="rounded-md border border-warning/40 bg-warning/5 p-2 text-xs text-warning">
          {result.warnings.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input (.env)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                aria-label=".env input"
                placeholder={"KEY=value\n# comment\nOTHER=\"quoted value\""}
              />
            </div>
          }
          output={<OutputPane value={result.output} error={result.error?.message ?? null} placeholder="Formatted .env will appear here" />}
        />
      </div>
    </div>
  );
}
