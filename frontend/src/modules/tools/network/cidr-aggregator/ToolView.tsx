"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runCidrAggregator } from "./transform";
import type { CidrAggregatorOptions } from "./schema";

type Options = CidrAggregatorOptions;

const defaultOptions: Options = {"output":"cidr"} as Options;

export function CidrAggregatorToolView() {
  const [input, setInput] = useState("10.0.0.0/25\n10.0.0.128/25\n10.0.1.0/24\n192.168.1.5\n192.168.1.4\n192.168.1.6/31\n2001:db8::/33\n2001:db8:8000::/33");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runCidrAggregator(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.output}
            onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}
          >
            <option value="cidr">{"CIDR list"}</option>
            <option value="range">{"Start - end ranges"}</option>
            <option value="summary">{"Summary"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">IPs and CIDRs (space, comma or newline separated)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"10.0.0.0/25\n10.0.0.128/25"}
                aria-label="IPs and CIDRs (space, comma or newline separated)"
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
