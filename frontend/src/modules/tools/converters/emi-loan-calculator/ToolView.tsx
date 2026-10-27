"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";


import { calcEmi } from "./transform";
import type { EmiLoanCalculatorOptions } from "./schema";

type Options = EmiLoanCalculatorOptions;

const defaultOptions: Options = {"principal":1000000,"rate":8.5,"tenure":20,"tenureUnit":"years","schedule":false} as Options;

export function EmiLoanCalculatorToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => calcEmi(input, options), [input, options]);
  void setInput;
  void input;
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Loan amount
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
          Interest % p.a.
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
          Tenure
          <input
            type="number"
            min={0} 
            value={options.tenure}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, tenure: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Unit
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.tenureUnit}
            onChange={(e) => setOptions((o) => ({ ...o, tenureUnit: e.target.value as Options["tenureUnit"] }))}
          >
            <option value="years">{"Years"}</option>
            <option value="months">{"Months"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.schedule} onChange={(e) => setOptions((o) => ({ ...o, schedule: e.target.checked }))} />
          Show schedule
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <OutputPane label="Result" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />
      </div>
    </div>
  );
}
