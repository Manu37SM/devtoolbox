"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { lookupHttpStatus } from "./transform";
import type { HttpStatusCodesOptions } from "./schema";

type Options = HttpStatusCodesOptions;

const defaultOptions: Options = {"compact":false} as Options;

export function HttpStatusCodesToolView() {
  const [input, setInput] = useState("4xx");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => lookupHttpStatus(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.compact} onChange={(e) => setOptions((o) => ({ ...o, compact: e.target.checked }))} />
          Compact list
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Search</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="404, 4xx, redirect, rate limit…"
                aria-label="Search"
                
              />
            </div>
          }
          output={<OutputPane label="Status codes" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
