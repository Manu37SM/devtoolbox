"use client";

import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/ui/CodeEditor";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { formatJson } from "./transform";
import type { JsonFormatterOptions } from "./schema";

const defaultOptions: JsonFormatterOptions = { indent: 2, sortKeys: false, mode: "beautify" };

export function JsonFormatterToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<JsonFormatterOptions>(defaultOptions);

  const result = useMemo(() => formatJson(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          <Button
            variant={options.mode === "beautify" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "beautify" }))}
          >
            Beautify
          </Button>
          <Button
            variant={options.mode === "minify" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "minify" }))}
          >
            Minify
          </Button>
        </div>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.sortKeys}
            onChange={(e) => setOptions((o) => ({ ...o, sortKeys: e.target.checked }))}
          />
          Sort keys
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Indent
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={String(options.indent)}
            onChange={(e) =>
              setOptions((o) => ({
                ...o,
                indent: e.target.value === "tab" ? "tab" : (Number(e.target.value) as 2 | 4),
              }))
            }
          >
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tab</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <CodeEditor
                value={input}
                onChange={(e) => setInput(e.target.value)}
                language="json"
                placeholder='{"hello":"world"}'
                aria-label="JSON input"
              />
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
              placeholder="Formatted JSON will appear here"
            />
          }
        />
      </div>
    </div>
  );
}
