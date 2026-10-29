"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runXirrCagrCalculator } from "./transform";
import type { XirrCagrCalculatorOptions } from "./schema";

type Options = XirrCagrCalculatorOptions;

const defaultOptions: Options = {"mode":"xirr"} as Options;

export function XirrCagrCalculatorToolView() {
  const [input, setInput] = useState("2024-01-05 -5000\n2024-02-05 -5000\n2024-03-05 -5000\n2024-04-05 -5000\n2024-05-05 -5000\n2024-06-05 -5000\n2025-01-05 32500");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runXirrCagrCalculator(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Mode
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.mode}
            onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}
          >
            <option value="xirr">{"XIRR (cash flows)"}</option>
            <option value="cagr">{"CAGR (start and end)"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">XIRR: date amount per line (investments negative). CAGR: start, end, years</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="2024-01-05 -5000"
                aria-label="XIRR: date amount per line (investments negative). CAGR: start, end, years"
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
