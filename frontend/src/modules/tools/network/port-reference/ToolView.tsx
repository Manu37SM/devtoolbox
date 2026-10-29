"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";


import { lookupPorts } from "./transform";
import type { PortReferenceOptions } from "./schema";

type Options = PortReferenceOptions;

const defaultOptions: Options = {"protocol":"any"} as Options;

export function PortReferenceToolView() {
  const [input, setInput] = useState("kafka\n1521\n8000-8100");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => lookupPorts(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["any","Any"],["TCP","TCP"],["UDP","UDP"]] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={options.protocol === value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, protocol: value as Options["protocol"] }))}
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
              <label className="text-sm font-medium text-text-secondary">Port, range or name (one per line; empty = all)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="8080\nkafka\n8000-8100"
                aria-label="Port, range or name (one per line; empty = all)"
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
