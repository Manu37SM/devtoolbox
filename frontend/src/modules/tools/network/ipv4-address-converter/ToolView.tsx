"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { convertIpv4Address } from "./transform";
import { ipv4AddressConverterOptionsSchema, type Ipv4AddressConverterOptions } from "./schema";

type Options = Ipv4AddressConverterOptions;

const defaultOptions: Options = ipv4AddressConverterOptionsSchema.parse({});

export function Ipv4AddressConverterToolView() {
  const [input, setInput] = useState("192.168.0.1");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertIpv4Address(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.output}
            onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}
          >
            <option value="details">All representations</option>
            <option value="dotted">Dotted only</option>
            <option value="integer">Integer only</option>
            <option value="hex">Hex only</option>
            <option value="binary">Binary only</option>
            <option value="csv">CSV table</option>
          </select>
        </label>
        <label
          className="flex items-center gap-1.5 text-sm text-text-secondary"
          title="Shortened (127.1), octal (0177.0.0.1) and hex (0x7f.1) forms that browsers and curl accept — often used to bypass SSRF filters"
        >
          <input
            type="checkbox"
            checked={options.inetAton}
            onChange={(e) => setOptions((o) => ({ ...o, inetAton: e.target.checked }))}
          />
          Accept legacy forms (127.1, 0177.0.0.1)
        </label>
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
