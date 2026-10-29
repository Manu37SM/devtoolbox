"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { convertIpv4Address } from "./transform";
import type { Ipv4AddressConverterOptions } from "./schema";

type Options = Ipv4AddressConverterOptions;

const defaultOptions: Options = {} as Options;

export function Ipv4AddressConverterToolView() {
  const [input, setInput] = useState("192.168.0.1");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertIpv4Address(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">IPv4 address (any notation, one per line)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="192.168.0.1 · 3232235521 · 0xC0A80001"
                aria-label="IPv4 address (any notation, one per line)"
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
