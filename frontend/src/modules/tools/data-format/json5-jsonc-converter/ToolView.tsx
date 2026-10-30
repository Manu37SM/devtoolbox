"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { convertJson5 } from "./transform";
import type { Json5JsoncConverterOptions } from "./schema";

type Options = Json5JsoncConverterOptions;

const defaultOptions: Options = {"direction":"to-json","indent":"2","trailingCommas":false} as Options;

export function Json5JsoncConverterToolView() {
  const [input, setInput] = useState("{\n  // compiler options\n  compilerOptions: {\n    target: 'ES2022',\n    strict: true, /* keep on */\n  },\n  include: ['src'],\n}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertJson5(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Convert to
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.direction}
            onChange={(e) => setOptions((o) => ({ ...o, direction: e.target.value as Options["direction"] }))}
          >
            <option value="to-json">{"Strict JSON"}</option>
            <option value="to-json5">{"JSON5"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Indent
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.indent}
            onChange={(e) => setOptions((o) => ({ ...o, indent: e.target.value as Options["indent"] }))}
          >
            <option value="2">{"2 spaces"}</option>
            <option value="4">{"4 spaces"}</option>
            <option value="tab">{"Tab"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.trailingCommas} onChange={(e) => setOptions((o) => ({ ...o, trailingCommas: e.target.checked }))} />
          Trailing commas (JSON5)
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">JSON5 / JSONC / JSON</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"{ // comment\n  key: 'value',\n}"}
                aria-label="JSON5 / JSONC / JSON"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane onSwap={() => setOptions((o) => ({ ...o, direction: o.direction === "to-json" ? "to-json5" : o.direction === "to-json5" ? "to-json" : o.direction }))} label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
