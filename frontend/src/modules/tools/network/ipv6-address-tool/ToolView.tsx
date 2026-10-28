"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runIpv6 } from "./transform";
import type { Ipv6AddressToolOptions } from "./schema";

type Options = Ipv6AddressToolOptions;

const defaultOptions: Options = {"details":true} as Options;

export function Ipv6AddressToolToolView() {
  const [input, setInput] = useState("2001:0db8:0000:0000:0000:ff00:0042:8329\nfe80::1\n::ffff:192.0.2.128");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runIpv6(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.details} onChange={(e) => setOptions((o) => ({ ...o, details: e.target.checked }))} />
          Show type and reverse DNS
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">IPv6 addresses (one per line)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="2001:0db8:0000:0000:0000:ff00:0042:8329"
                aria-label="IPv6 addresses (one per line)"
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
