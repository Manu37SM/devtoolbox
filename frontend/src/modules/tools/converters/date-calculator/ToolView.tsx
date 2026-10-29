"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";


import { calcDates } from "./transform";
import type { DateCalculatorOptions } from "./schema";

type Options = DateCalculatorOptions;

const defaultOptions: Options = {"inclusive":false} as Options;

export function DateCalculatorToolView() {
  const [input, setInput] = useState("2026-01-01 to 2026-12-25\n2026-01-31 + 1 month\n2026-10-30 + 5 business days");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => calcDates(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.inclusive} onChange={(e) => setOptions((o) => ({ ...o, inclusive: e.target.checked }))} />
          Count both end dates
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Dates (one per line, YYYY-MM-DD)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="2026-01-01 to 2026-12-25"
                aria-label="Dates (one per line, YYYY-MM-DD)"
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
