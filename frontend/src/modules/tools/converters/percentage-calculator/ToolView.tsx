"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";


import { calcPercentage } from "./transform";
import { percentageCalculatorOptionsSchema, type PercentageCalculatorOptions } from "./schema";

type Options = PercentageCalculatorOptions;

const defaultOptions: Options = percentageCalculatorOptionsSchema.parse({});

export function PercentageCalculatorToolView() {
  const [input, setInput] = useState(
    "20% of 150\n30 is what % of 120\nfrom 80 to 100\nincrease 100 by 15%\n25% off 80\n30 is 20% of what\n200 + 18%\nmargin 80 price 100",
  );
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => calcPercentage(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Max decimals
          <input
            type="number"
            min={0}
            max={10}
            value={options.decimals}
            onChange={(e) => setOptions((o) => ({ ...o, decimals: Math.min(10, Math.max(0, Number(e.target.value) || 0)) }))}
            className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.output}
            onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}
          >
            <option value="line">Question = answer</option>
            <option value="result">Answers only</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.grouping}
            onChange={(e) => setOptions((o) => ({ ...o, grouping: e.target.checked }))}
          />
          Thousands separators
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Questions (one per line)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="20% of 150"
                aria-label="Questions (one per line)"
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
