"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";


import { validateIndianId } from "./transform";
import type { IndianIdValidatorOptions } from "./schema";

type Options = IndianIdValidatorOptions;

const defaultOptions: Options = {"mask":true} as Options;

export function IndianIdValidatorToolView() {
  const [input, setInput] = useState("27AAPFU0939F1ZV\nHDFC0001234");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => validateIndianId(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.mask} onChange={(e) => setOptions((o) => ({ ...o, mask: e.target.checked }))} />
          Mask digits in output
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">IDs (one per line) — use test data, not real IDs of people</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder=""
                aria-label="IDs (one per line) — use test data, not real IDs of people"
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
