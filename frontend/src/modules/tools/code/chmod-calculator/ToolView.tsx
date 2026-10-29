"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { convertChmod } from "./transform";
import type { ChmodCalculatorOptions } from "./schema";

type Options = ChmodCalculatorOptions;

const defaultOptions: Options = {"current":"644"} as Options;

export function ChmodCalculatorToolView() {
  const [input, setInput] = useState("755");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertChmod(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Current mode (for u+x style changes)
          <input
            type="text"
            value={options.current}
            placeholder=""
            onChange={(e) => setOptions((o) => ({ ...o, current: e.target.value }))}
            className="w-36 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Mode</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="755, rwxr-xr-x, or u+x,go-w"
                aria-label="Mode"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
