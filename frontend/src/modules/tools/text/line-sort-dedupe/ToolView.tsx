"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { sortDedupeLines } from "./transform";
import type { LineDedupeMode, LineSortDedupeOptions, LineSortMode } from "./schema";

const SORT_OPTIONS: { value: LineSortMode; label: string }[] = [
  { value: "none", label: "No sort" },
  { value: "alpha", label: "A → Z" },
  { value: "alpha-desc", label: "Z → A" },
  { value: "numeric", label: "Numeric" },
  { value: "length", label: "By length" },
  { value: "shuffle", label: "Shuffle" },
];

const DEDUPE_OPTIONS: { value: LineDedupeMode; label: string }[] = [
  { value: "none", label: "No dedupe" },
  { value: "exact", label: "Exact" },
  { value: "case-insensitive", label: "Case-insensitive" },
];

export function LineSortDedupeToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<LineSortDedupeOptions>({
    sort: "none",
    dedupe: "none",
    trimEmptyLines: false,
    trimWhitespace: false,
  });

  const result = useMemo(() => sortDedupeLines(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={options.sort}
          onChange={(e) => setOptions((o) => ({ ...o, sort: e.target.value as LineSortMode }))}
          className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          aria-label="Sort mode"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={options.dedupe}
          onChange={(e) => setOptions((o) => ({ ...o, dedupe: e.target.value as LineDedupeMode }))}
          className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          aria-label="Dedupe mode"
        >
          {DEDUPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.trimWhitespace}
            onChange={(e) => setOptions((o) => ({ ...o, trimWhitespace: e.target.checked }))}
          />
          Trim whitespace
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.trimEmptyLines}
            onChange={(e) => setOptions((o) => ({ ...o, trimEmptyLines: e.target.checked }))}
          />
          Remove empty lines
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea value={input} onChange={(e) => setInput(e.target.value)} aria-label="Lines to process" />
            </div>
          }
          output={<OutputPane value={result.output} error={result.error?.message ?? null} placeholder="Output will appear here" />}
        />
      </div>
    </div>
  );
}
