"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { formatYaml } from "./transform";
import type { YamlFormatterOptions } from "./schema";

export function YamlFormatterToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<YamlFormatterOptions>({ indent: 2, sortKeys: false, quoteStyle: "auto", indentSequences: true });

  const result = useMemo(() => formatYaml(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Indent
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={String(options.indent)}
            onChange={(e) => setOptions((o) => ({ ...o, indent: (Number(e.target.value) as 2 | 4) }))}
          >
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.sortKeys}
            onChange={(e) => setOptions((o) => ({ ...o, sortKeys: e.target.checked }))}
          />
          Sort keys
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Quotes
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.quoteStyle}
            onChange={(e) => setOptions((o) => ({ ...o, quoteStyle: e.target.value as YamlFormatterOptions["quoteStyle"] }))}
          >
            <option value="auto">As needed</option>
            <option value="single">Always single</option>
            <option value="double">Always double</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.indentSequences}
            onChange={(e) => setOptions((o) => ({ ...o, indentSequences: e.target.checked }))}
          />
          Indent list items
        </label>
      </div>
      <div className="min-h-0 flex-1">
      <DualPane
        input={
          <div className="flex h-full flex-col gap-2">
            <label className="text-sm font-medium text-text-secondary">Input</label>
            <ToolInput as="code" value={input} onChange={(e) => setInput(e.target.value)} language="yaml" aria-label="YAML input" />
          </div>
        }
        output={
          <OutputPane
            value={result.output}
            error={
              result.error
                ? `${result.error.message}${result.error.line ? ` (line ${result.error.line}, column ${result.error.column})` : ""}`
                : null
            }
          />
        }
      />
      </div>
    </div>
  );
}
