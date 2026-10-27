"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";


import { convertIndianNumber } from "./transform";
import type { IndianNumberSystemConverterOptions } from "./schema";

type Options = IndianNumberSystemConverterOptions;

const defaultOptions: Options = {"words":true,"shorthand":true} as Options;

export function IndianNumberSystemConverterToolView() {
  const [input, setInput] = useState("12345678\n₹1,50,000.50");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertIndianNumber(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.words} onChange={(e) => setOptions((o) => ({ ...o, words: e.target.checked }))} />
          Show in words
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.shorthand} onChange={(e) => setOptions((o) => ({ ...o, shorthand: e.target.checked }))} />
          Show lakh / crore
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Numbers (one per line)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="12345678"
                aria-label="Numbers (one per line)"
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
