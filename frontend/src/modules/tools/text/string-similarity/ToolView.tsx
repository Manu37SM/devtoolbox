"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { compareInput } from "./transform";
import type { StringSimilarityOptions } from "./schema";

type Options = StringSimilarityOptions;

const defaultOptions: Options = {"ignoreCase":true} as Options;

export function StringSimilarityToolView() {
  const [input, setInput] = useState("kitten\nsitting\nmitten\nkitchen");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => compareInput(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.ignoreCase} onChange={(e) => setOptions((o) => ({ ...o, ignoreCase: e.target.checked }))} />
          Ignore case
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Reference line first, then lines to compare</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"kitten\nsitting\nmitten"}
                aria-label="Reference line first, then lines to compare"
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
