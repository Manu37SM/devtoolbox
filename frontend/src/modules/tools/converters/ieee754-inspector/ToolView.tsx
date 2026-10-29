"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";


import { inspectIeee754 } from "./transform";
import type { Ieee754InspectorOptions } from "./schema";

type Options = Ieee754InspectorOptions;

const defaultOptions: Options = {"width":"both"} as Options;

export function Ieee754InspectorToolView() {
  const [input, setInput] = useState("0.1");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => inspectIeee754(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["32","float32"],["64","float64"],["both","Both"]] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={options.width === value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, width: value as Options["width"] }))}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Numbers or hex (one per line)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="0.1 · NaN · 0x3FF0000000000000"
                aria-label="Numbers or hex (one per line)"
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
