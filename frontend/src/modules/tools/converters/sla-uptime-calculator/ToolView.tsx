"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runSlaUptimeCalculator } from "./transform";
import type { SlaUptimeCalculatorOptions } from "./schema";

type Options = SlaUptimeCalculatorOptions;

const defaultOptions: Options = {"mode":"table","month":"average"} as Options;

export function SlaUptimeCalculatorToolView() {
  const [input, setInput] = useState("99\n99.9\n99.95\n99.99\n5 min per day");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runSlaUptimeCalculator(input, options), [input, options]);

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
            <option value="table">{"Downtime table"}</option>
            <option value="series">{"Combine in series"}</option>
            <option value="parallel">{"Combine in parallel"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Month
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.month}
            onChange={(e) => setOptions((o) => ({ ...o, month: e.target.value as Options["month"] }))}
          >
            <option value="average">{"30.44 days"}</option>
            <option value="30">{"30 days"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Availability (99.95) or downtime (43m per month), one per line</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="99.9"
                aria-label="Availability (99.95) or downtime (43m per month), one per line"
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
