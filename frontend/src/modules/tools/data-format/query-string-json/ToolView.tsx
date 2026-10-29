"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";
import { convertQueryStringJson } from "./transform";
import type { QueryStringJsonOptions } from "./schema";

export function QueryStringJsonToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<QueryStringJsonOptions>({
    mode: "qs-to-json",
    nested: true,
    parseValues: false,
    arrayStyle: "repeat",
  });

  const result = useMemo(() => convertQueryStringJson(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          {(
            [
              ["qs-to-json", "Query → JSON"],
              ["json-to-qs", "JSON → Query"],
            ] as const
          ).map(([mode, label]) => (
            <Button
              key={mode}
              variant={options.mode === mode ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, mode }))}
            >
              {label}
            </Button>
          ))}
        </div>
        {options.mode === "qs-to-json" ? (
          <>
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={options.nested}
                onChange={(e) => setOptions((o) => ({ ...o, nested: e.target.checked }))}
              />
              Nest a[b][]=c
            </label>
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={options.parseValues}
                onChange={(e) => setOptions((o) => ({ ...o, parseValues: e.target.checked }))}
              />
              Parse numbers / booleans / null
            </label>
          </>
        ) : (
          <label className="flex items-center gap-1.5 text-sm text-text-secondary">
            Arrays
            <select
              className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
              value={options.arrayStyle}
              onChange={(e) => setOptions((o) => ({ ...o, arrayStyle: e.target.value as QueryStringJsonOptions["arrayStyle"] }))}
            >
              <option value="repeat">Repeat key (t=a&amp;t=b)</option>
              <option value="brackets">Brackets (t[]=a&amp;t[]=b)</option>
            </select>
          </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={options.mode === "qs-to-json" ? "https://example.com/search?q=hello&tag=a&tag=b" : '{"q": "hello", "tag": ["a", "b"]}'}
                aria-label="Query string or JSON input"
              />
            </div>
          }
          output={<OutputPane onSwap={() => setOptions((o) => ({ ...o, mode: o.mode === "qs-to-json" ? "json-to-qs" : o.mode === "json-to-qs" ? "qs-to-json" : o.mode }))} value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
