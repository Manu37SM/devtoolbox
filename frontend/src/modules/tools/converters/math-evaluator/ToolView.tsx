"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";


import { evaluateLines } from "./transform";
import type { MathEvaluatorOptions } from "./schema";

type Options = MathEvaluatorOptions;

const defaultOptions: Options = {"angle":"rad","precision":12,"allowCommas":true} as Options;

export function MathEvaluatorToolView() {
  const [input, setInput] = useState("price = 1200\ntax = price * 0.18\nprice + tax\nsqrt(2) * 10");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => evaluateLines(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["rad","Radians"],["deg","Degrees"]] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={options.angle === value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, angle: value as Options["angle"] }))}
            >
              {label}
            </Button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Significant digits
          <input
            type="number"
            min={1} max={21}
            value={options.precision}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, precision: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.allowCommas} onChange={(e) => setOptions((o) => ({ ...o, allowCommas: e.target.checked }))} />
          Strip thousands commas
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Expressions (one per line)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="price = 1200\nprice * 1.18"
                aria-label="Expressions (one per line)"
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
