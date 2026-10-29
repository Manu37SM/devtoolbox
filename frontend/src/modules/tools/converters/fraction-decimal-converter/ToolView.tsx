"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { convertFractions } from "./transform";
import type { FractionDecimalConverterOptions } from "./schema";

type Options = FractionDecimalConverterOptions;

const defaultOptions: Options = {"maxDenominator":"1000","precision":10,"mixed":true} as Options;

export function FractionDecimalConverterToolView() {
  const [input, setInput] = useState("0.375\n2/3\n1 3/4\n12.5%\n3.14159265358979");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertFractions(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Max denominator
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.maxDenominator}
            onChange={(e) => setOptions((o) => ({ ...o, maxDenominator: e.target.value as Options["maxDenominator"] }))}
          >
            <option value="16">{"16 (rulers)"}</option>
            <option value="100">{"100"}</option>
            <option value="1000">{"1,000"}</option>
            <option value="10000">{"10,000"}</option>
            <option value="1000000">{"1,000,000"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Decimal places
          <input
            type="number"
            min={1} max={30}
            value={options.precision}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, precision: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.mixed} onChange={(e) => setOptions((o) => ({ ...o, mixed: e.target.checked }))} />
          Show mixed numbers
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Values (one per line: 0.375, 3/8, 1 3/4, 12.5%)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="0.375"
                aria-label="Values (one per line: 0.375, 3/8, 1 3/4, 12.5%)"
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
