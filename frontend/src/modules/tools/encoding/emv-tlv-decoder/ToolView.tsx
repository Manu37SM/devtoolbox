"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runEmvTlvDecoder } from "./transform";
import type { EmvTlvDecoderOptions } from "./schema";

type Options = EmvTlvDecoderOptions;

const defaultOptions: Options = {"maskSensitive":true,"explainBits":true} as Options;

export function EmvTlvDecoderToolView() {
  const [input, setInput] = useState("9F2701809F360200019F2608AABBCCDDEEFF0011950580000480009A032401319C01005F2A0203569F02060000000125509F1A0203565A0841111111111111115F3401019F3403420302");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runEmvTlvDecoder(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.maskSensitive} onChange={(e) => setOptions((o) => ({ ...o, maskSensitive: e.target.checked }))} />
          Mask card data
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.explainBits} onChange={(e) => setOptions((o) => ({ ...o, explainBits: e.target.checked }))} />
          Explain TVR/TSI/AIP bits
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">TLV hex</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="9F2701809F3602..."
                aria-label="TLV hex"
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
