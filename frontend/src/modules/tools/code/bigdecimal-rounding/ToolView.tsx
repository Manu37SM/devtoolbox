"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runBigdecimalRounding } from "./transform";
import type { BigdecimalRoundingOptions } from "./schema";

type Options = BigdecimalRoundingOptions;

const defaultOptions: Options = {"scale":2,"showDouble":true} as Options;

export function BigdecimalRoundingToolView() {
  const [input, setInput] = useState("2.675\n1.005\n-2.5\n0.125\n19.995");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runBigdecimalRounding(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Scale
          <input
            type="number"
            min={-20} max={40}
            value={options.scale}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, scale: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showDouble} onChange={(e) => setOptions((o) => ({ ...o, showDouble: e.target.checked }))} />
          Show double pitfalls
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Values (one per line)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="2.675"
                aria-label="Values (one per line)"
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
