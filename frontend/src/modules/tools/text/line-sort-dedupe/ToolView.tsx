"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { sortDedupeLines } from "./transform";
import {
  lineSortDedupeOptionsSchema,
  type LineDedupeMode,
  type LineSortDedupeOptions,
  type LineSortMode,
} from "./schema";

const SORT_OPTIONS: { value: LineSortMode; label: string }[] = [
  { value: "none", label: "No sort" },
  { value: "alpha", label: "A → Z" },
  { value: "alpha-desc", label: "Z → A" },
  { value: "natural", label: "Natural (item2 < item10)" },
  { value: "natural-desc", label: "Natural, descending" },
  { value: "numeric", label: "Numeric" },
  { value: "numeric-desc", label: "Numeric, descending" },
  { value: "length", label: "Shortest first" },
  { value: "length-desc", label: "Longest first" },
  { value: "reverse", label: "Reverse order" },
  { value: "shuffle", label: "Shuffle" },
];

const DEDUPE_OPTIONS: { value: LineDedupeMode; label: string }[] = [
  { value: "none", label: "No dedupe" },
  { value: "exact", label: "Exact" },
  { value: "case-insensitive", label: "Case-insensitive" },
  { value: "unique", label: "Only lines that appear once" },
  { value: "duplicates", label: "Only repeated lines" },
];

export function LineSortDedupeToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<LineSortDedupeOptions>(() => lineSortDedupeOptionsSchema.parse({}));

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
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.caseSensitive}
            onChange={(e) => setOptions((o) => ({ ...o, caseSensitive: e.target.checked }))}
          />
          Case-sensitive (A–Z before a–z)
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.countOccurrences}
            onChange={(e) => setOptions((o) => ({ ...o, countOccurrences: e.target.checked }))}
          />
          Prefix counts
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Sort by column (0 = line)
          <input
            type="number"
            min={0}
            max={1000}
            value={options.column}
            onChange={(e) => setOptions((o) => ({ ...o, column: Math.min(1000, Math.max(0, Number(e.target.value) || 0)) }))}
            className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        {options.column > 0 && (
          <label className="flex items-center gap-1.5 text-sm text-text-secondary">
            separated by
            <select
              className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
              value={options.columnDelimiter}
              onChange={(e) => setOptions((o) => ({ ...o, columnDelimiter: e.target.value as LineSortDedupeOptions["columnDelimiter"] }))}
            >
              <option value="whitespace">spaces</option>
              <option value=",">comma</option>
              <option value={"\t"}>tab</option>
              <option value=";">semicolon</option>
              <option value="|">pipe</option>
              <option value=":">colon</option>
            </select>
          </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <ToolInput value={input} onChange={(e) => setInput(e.target.value)} aria-label="Lines to process" />
            </div>
          }
          output={<OutputPane label={result.stats && result.stats.output !== result.stats.input ? `Output (${result.stats.input} → ${result.stats.output} lines)` : undefined} value={result.output} error={result.error?.message ?? null} placeholder="Output will appear here" />}
        />
      </div>
    </div>
  );
}
