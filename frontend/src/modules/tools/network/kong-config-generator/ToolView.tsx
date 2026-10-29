"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { generateKong } from "./transform";
import type { KongConfigGeneratorOptions } from "./schema";

type Options = KongConfigGeneratorOptions;

const defaultOptions: Options = {"format":"declarative"} as Options;

export function KongConfigGeneratorToolView() {
  const [input, setInput] = useState("service: orders\nurl: http://orders.internal:8080\nroute: /orders\nmethods: GET, POST\nplugins: rate-limiting, key-auth, correlation-id\nrate: 100/minute");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateKong(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.format}
            onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}
          >
            <option value="declarative">{"kong.yml (declarative)"}</option>
            <option value="admin-api">{"Admin API curl"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Service fields (separate multiple services with ---)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="service: orders"
                aria-label="Service fields (separate multiple services with ---)"
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
