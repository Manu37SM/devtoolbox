"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runSip } from "./transform";
import type { SipCalculatorOptions } from "./schema";

type Options = SipCalculatorOptions;

const defaultOptions: Options = {"mode":"future-value","yearlyTable":false} as Options;

export function SipCalculatorToolView() {
  const [input, setInput] = useState("monthly: 10000\nrate: 12\nyears: 10\nstepup: 10\ninflation: 6");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runSip(input, options), [input, options]);

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
            <option value="future-value">{"Future value"}</option>
            <option value="required-sip">{"Required SIP for a goal"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.yearlyTable} onChange={(e) => setOptions((o) => ({ ...o, yearlyTable: e.target.checked }))} />
          Year-by-year table
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Fields: monthly, rate, years, stepup, lump, inflation, target</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="monthly: 10000"
                aria-label="Fields: monthly, rate, years, stepup, lump, inflation, target"
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
