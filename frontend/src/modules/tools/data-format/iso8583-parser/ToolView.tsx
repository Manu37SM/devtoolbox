"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runIso8583Parser } from "./transform";
import type { Iso8583ParserOptions } from "./schema";

type Options = Iso8583ParserOptions;

const defaultOptions: Options = {"encoding":"ascii","maskSensitive":true} as Options;

export function Iso8583ParserToolView() {
  const [input, setInput] = useState("02007238048028C08000164111111111111111000000000000012550013110153012345616153001310510024411111111111111=251210140311012345 6TERM0001MERCHANT0000001356");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runIso8583Parser(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Encoding
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.encoding}
            onChange={(e) => setOptions((o) => ({ ...o, encoding: e.target.value as Options["encoding"] }))}
          >
            <option value="ascii">{"ASCII, hex bitmap"}</option>
            <option value="ascii-binary-bitmap">{"ASCII, binary bitmap (hex input)"}</option>
            <option value="bcd">{"BCD packed (hex input)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.maskSensitive} onChange={(e) => setOptions((o) => ({ ...o, maskSensitive: e.target.checked }))} />
          Mask card data
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">ISO 8583 message</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="0200723804..."
                aria-label="ISO 8583 message"
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
