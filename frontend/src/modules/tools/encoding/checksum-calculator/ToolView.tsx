"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";


import { checksum } from "./transform";
import type { ChecksumCalculatorOptions } from "./schema";

type Options = ChecksumCalculatorOptions;

const defaultOptions: Options = {"algorithm":"all","inputFormat":"text"} as Options;

export function ChecksumCalculatorToolView() {
  const [input, setInput] = useState("123456789");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => checksum(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Algorithm
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.algorithm}
            onChange={(e) => setOptions((o) => ({ ...o, algorithm: e.target.value as Options["algorithm"] }))}
          >
            <option value="all">{"All"}</option>
            <option value="crc32">{"CRC-32"}</option>
            <option value="crc32c">{"CRC-32C"}</option>
            <option value="adler32">{"Adler-32"}</option>
            <option value="crc16">{"CRC-16"}</option>
            <option value="fletcher16">{"Fletcher-16"}</option>
          </select>
        </label>
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["text","Text"],["hex","Hex bytes"]] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={options.inputFormat === value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, inputFormat: value as Options["inputFormat"] }))}
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
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="123456789"
                aria-label="Input"
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
