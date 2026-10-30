"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { expandIpv4 } from "./transform";
import type { Ipv4RangeExpanderOptions } from "./schema";

type Options = Ipv4RangeExpanderOptions;

const defaultOptions: Options = {"showUsable":true} as Options;

export function Ipv4RangeExpanderToolView() {
  const [input, setInput] = useState("192.168.0.1 - 192.168.0.10\n10.0.0.0/22");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => expandIpv4(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showUsable} onChange={(e) => setOptions((o) => ({ ...o, showUsable: e.target.checked }))} />
          Show usable hosts
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Range (start - end) or CIDR, one per line</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"192.168.0.1 - 192.168.0.10\n10.0.0.0/22"}
                aria-label="Range (start - end) or CIDR, one per line"
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
