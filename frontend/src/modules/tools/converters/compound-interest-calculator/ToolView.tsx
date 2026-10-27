"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";


import { calcCompound } from "./transform";
import type { CompoundInterestCalculatorOptions } from "./schema";

type Options = CompoundInterestCalculatorOptions;

const defaultOptions: Options = {"principal":100000,"monthly":5000,"rate":12,"years":10,"compounding":"12","yearly":true} as Options;

export function CompoundInterestCalculatorToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => calcCompound(input, options), [input, options]);
  void setInput;
  void input;
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Starting amount
          <input
            type="number"
            min={0} 
            value={options.principal}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, principal: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Monthly contribution
          <input
            type="number"
            min={0} 
            value={options.monthly}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, monthly: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Rate % p.a.
          <input
            type="number"
            min={0} max={100}
            value={options.rate}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, rate: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Years
          <input
            type="number"
            min={0} max={100}
            value={options.years}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, years: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Compounding
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.compounding}
            onChange={(e) => setOptions((o) => ({ ...o, compounding: e.target.value as Options["compounding"] }))}
          >
            <option value="1">{"Yearly"}</option>
            <option value="2">{"Half-yearly"}</option>
            <option value="4">{"Quarterly"}</option>
            <option value="12">{"Monthly"}</option>
            <option value="365">{"Daily"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.yearly} onChange={(e) => setOptions((o) => ({ ...o, yearly: e.target.checked }))} />
          Year-by-year table
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <OutputPane label="Result" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />
      </div>
    </div>
  );
}
