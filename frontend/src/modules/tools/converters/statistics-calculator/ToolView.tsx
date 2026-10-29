"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { calculateStatistics } from "./transform";
import type { StatisticsCalculatorOptions } from "./schema";

type Options = StatisticsCalculatorOptions;

const defaultOptions: Options = {"decimals":4,"percentile":90} as Options;

export function StatisticsCalculatorToolView() {
  const [input, setInput] = useState("2, 4, 4, 4, 5, 5, 7, 9, 120");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => calculateStatistics(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Decimals
          <input
            type="number"
            min={0} max={10}
            value={options.decimals}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, decimals: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Percentile
          <input
            type="number"
            min={0} max={100}
            value={options.percentile}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, percentile: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Numbers (space, comma or newline separated)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="2, 4, 4, 4, 5, 5, 7, 9"
                aria-label="Numbers (space, comma or newline separated)"
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
