"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { matchIps } from "./transform";
import type { IpCidrMatcherOptions } from "./schema";

type Options = IpCidrMatcherOptions;

const defaultOptions: Options = {"showAll":false} as Options;

export function IpCidrMatcherToolView() {
  const [input, setInput] = useState("10.0.0.0/8\n10.1.0.0/16\n192.168.0.0/24\n2001:db8::/32\n---\n10.1.5.5\n10.9.9.9\n192.168.1.1\n2001:db8::42");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => matchIps(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showAll} onChange={(e) => setOptions((o) => ({ ...o, showAll: e.target.checked }))} />
          List every matching range
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">CIDR ranges, a line containing only ---, then IPs</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"10.0.0.0/8\n---\n10.1.2.3"}
                aria-label="CIDR ranges, a line containing only ---, then IPs"
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
