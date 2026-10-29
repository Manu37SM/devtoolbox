"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";
import { convertJsonYaml } from "./transform";
import type { JsonYamlOptions } from "./schema";

export function JsonYamlToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<JsonYamlOptions>({ mode: "json-to-yaml", indent: 2, sortKeys: false, quoteStyle: "auto", indentSequences: true });

  const result = useMemo(() => convertJsonYaml(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          <Button
            variant={options.mode === "json-to-yaml" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "json-to-yaml" }))}
          >
            JSON → YAML
          </Button>
          <Button
            variant={options.mode === "yaml-to-json" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "yaml-to-json" }))}
          >
            YAML → JSON
          </Button>
        </div>
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
        {options.mode === "json-to-yaml" && (
          <>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Quotes
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.quoteStyle}
            onChange={(e) => setOptions((o) => ({ ...o, quoteStyle: e.target.value as JsonYamlOptions["quoteStyle"] }))}
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
          </>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">
                {options.mode === "json-to-yaml" ? "JSON" : "YAML"}
              </label>
              <ToolInput
                as="code"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                language={options.mode === "json-to-yaml" ? "json" : "yaml"}
                aria-label="Input"
              />
            </div>
          }
          output={
            <OutputPane
              onSwap={() => setOptions((o) => ({ ...o, mode: o.mode === "json-to-yaml" ? "yaml-to-json" : o.mode === "yaml-to-json" ? "json-to-yaml" : o.mode }))}
              label={options.mode === "json-to-yaml" ? "YAML" : "JSON"}
              value={result.output}
              error={result.error?.message ?? null}
            />
          }
        />
      </div>
    </div>
  );
}
