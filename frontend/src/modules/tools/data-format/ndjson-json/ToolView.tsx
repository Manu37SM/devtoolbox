"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";
import { convertNdjson } from "./transform";
import type { NdjsonJsonOptions } from "./schema";

type Options = NdjsonJsonOptions;

const defaultOptions: Options = {"mode":"ndjson-to-json","indent":"2"} as Options;

export function NdjsonJsonToolView() {
  const [input, setInput] = useState("{\"id\":1}\n{\"id\":2}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertNdjson(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["ndjson-to-json","NDJSON → JSON"],["json-to-ndjson","JSON → NDJSON"]] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={options.mode === value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, mode: value as Options["mode"] }))}
            >
              {label}
            </Button>
          ))}
        </div>
        {options.mode === "ndjson-to-json" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Indent
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.indent}
            onChange={(e) => setOptions((o) => ({ ...o, indent: e.target.value as Options["indent"] }))}
          >
            <option value="0">{"Compact"}</option>
            <option value="2">{"2 spaces"}</option>
            <option value="4">{"4 spaces"}</option>
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
                placeholder=""
                aria-label="Input"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane onSwap={() => setOptions((o) => ({ ...o, mode: o.mode === "ndjson-to-json" ? "json-to-ndjson" : o.mode === "json-to-ndjson" ? "ndjson-to-json" : o.mode }))} label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
