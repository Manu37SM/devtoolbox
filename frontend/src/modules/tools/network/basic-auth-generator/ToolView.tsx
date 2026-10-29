"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";
import { convertBasicAuth } from "./transform";
import type { BasicAuthGeneratorOptions } from "./schema";

type Options = BasicAuthGeneratorOptions;

const defaultOptions: Options = {"mode":"encode","format":"header"} as Options;

export function BasicAuthGeneratorToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertBasicAuth(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["encode","Encode"],["decode","Decode"]] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={options.mode === value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, mode: value as Options["mode"] }))}
            >
              {label}
            </Button>
          ))}
        </div>
        {options.mode === "encode" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.format}
            onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}
          >
            <option value="header">{"Authorization: Basic …"}</option>
            <option value="value">{"Basic …"}</option>
            <option value="base64">{"Base64 only"}</option>
            <option value="curl">{"curl example"}</option>
          </select>
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">username:password (or a header to decode)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Aladdin:open sesame"
                aria-label="username:password (or a header to decode)"
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
