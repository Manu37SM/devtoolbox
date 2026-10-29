"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { formatXml } from "./transform";
import type { XmlFormatterOptions } from "./schema";
import { Button } from "@/components/ui/button";

export function XmlFormatterToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<XmlFormatterOptions>({
    indent: 2,
    mode: "beautify",
    stripComments: false,
    sortAttributes: false,
    attributesPerLine: false,
    expandEmpty: false,
  });
  const result = useMemo(() => formatXml(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          <Button
            variant={options.mode === "beautify" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            aria-pressed={options.mode === "beautify"}
            onClick={() => setOptions((o) => ({ ...o, mode: "beautify" }))}
          >
            Beautify
          </Button>
          <Button
            variant={options.mode === "minify" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            aria-pressed={options.mode === "minify"}
            onClick={() => setOptions((o) => ({ ...o, mode: "minify" }))}
          >
            Minify
          </Button>
        </div>
        {options.mode === "beautify" && (
          <>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Indent
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={String(options.indent)}
            onChange={(e) => setOptions((o) => ({ ...o, indent: (e.target.value === "tab" ? "tab" : (Number(e.target.value) as 2 | 4)) }))}
          >
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
            <option value="tab">Tab</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.attributesPerLine}
            onChange={(e) => setOptions((o) => ({ ...o, attributesPerLine: e.target.checked }))}
          />
          Attributes on separate lines
        </label>
          </>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.sortAttributes}
            onChange={(e) => setOptions((o) => ({ ...o, sortAttributes: e.target.checked }))}
          />
          Sort attributes
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.stripComments}
            onChange={(e) => setOptions((o) => ({ ...o, stripComments: e.target.checked }))}
          />
          Remove comments
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.expandEmpty}
            onChange={(e) => setOptions((o) => ({ ...o, expandEmpty: e.target.checked }))}
          />
          Expand empty tags
        </label>
      </div>
      <div className="min-h-0 flex-1">
      <DualPane
        input={
          <div className="flex h-full flex-col gap-2">
            <label className="text-sm font-medium text-text-secondary">Input</label>
            <ToolInput as="code" value={input} onChange={(e) => setInput(e.target.value)} language="xml" aria-label="XML input" />
          </div>
        }
        output={<OutputPane value={result.output} error={result.error?.message ?? null} />}
      />
      </div>
    </div>
  );
}
