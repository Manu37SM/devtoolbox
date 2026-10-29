"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";


import { convertBinaryText } from "./transform";
import type { BinaryTextConverterOptions } from "./schema";

type Options = BinaryTextConverterOptions;

const defaultOptions: Options = {"mode":"encode","base":"2"} as Options;

export function BinaryTextConverterToolView() {
  const [input, setInput] = useState("Hello");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertBinaryText(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["encode","Text → bytes"],["decode","Bytes → text"]] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={options.mode === value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, mode: value as Options["mode"] }))}
            >
              {label}
            </Button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Base
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.base}
            onChange={(e) => setOptions((o) => ({ ...o, base: e.target.value as Options["base"] }))}
          >
            <option value="2">{"Binary"}</option>
            <option value="8">{"Octal"}</option>
            <option value="10">{"Decimal"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hello"
                aria-label="Input"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane onSwap={() => setOptions((o) => ({ ...o, mode: o.mode === "encode" ? "decode" : o.mode === "decode" ? "encode" : o.mode }))} label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
