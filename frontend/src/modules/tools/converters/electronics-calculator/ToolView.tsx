"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runElectronics } from "./transform";
import type { ElectronicsCalculatorOptions } from "./schema";

type Options = ElectronicsCalculatorOptions;

const defaultOptions: Options = {"operation":"ohms-law"} as Options;

export function ElectronicsCalculatorToolView() {
  const [input, setInput] = useState("v: 12\ni: 20m");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runElectronics(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Calculator
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.operation}
            onChange={(e) => setOptions((o) => ({ ...o, operation: e.target.value as Options["operation"] }))}
          >
            <option value="ohms-law">{"Ohm's law"}</option>
            <option value="led-resistor">{"LED resistor"}</option>
            <option value="voltage-divider">{"Voltage divider"}</option>
            <option value="series-parallel">{"Series / parallel"}</option>
            <option value="rc-filter">{"RC filter"}</option>
            <option value="resistor-color-code">{"Resistor colour code"}</option>
            <option value="timer-555-astable">{"555 astable"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Values (key: value, SI suffixes like 4.7k, 100n, 20m)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"v: 12\ni: 20m"}
                aria-label="Values (key: value, SI suffixes like 4.7k, 100n, 20m)"
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
