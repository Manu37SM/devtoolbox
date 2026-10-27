"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";


import { bitwise } from "./transform";
import type { BitwiseCalculatorOptions } from "./schema";

type Options = BitwiseCalculatorOptions;

const defaultOptions: Options = {"width":"32"} as Options;

export function BitwiseCalculatorToolView() {
  const [input, setInput] = useState("0xF0 & 0x3C\n1 << 4\n~5\n-16 >> 2");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => bitwise(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["8","8-bit"],["16","16-bit"],["32","32-bit"],["64","64-bit"]] as const).map(([value, label]) => (
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
              <label className="text-sm font-medium text-text-secondary">Expressions (one per line)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="0xF0 & 0x3C"
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
