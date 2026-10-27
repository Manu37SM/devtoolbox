"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";


import { calcPercentage } from "./transform";
import type { PercentageCalculatorOptions } from "./schema";

type Options = PercentageCalculatorOptions;

const defaultOptions: Options = {} as Options;

export function PercentageCalculatorToolView() {
  const [input, setInput] = useState("20% of 150\n30 is what % of 120\nfrom 80 to 100\nincrease 100 by 15%\n25% off 80");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => calcPercentage(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Questions (one per line)</label>
              <Textarea
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
