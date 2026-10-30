"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";


import { analyzeHeaders } from "./transform";
import type { HttpHeaderAnalyzerOptions } from "./schema";

type Options = HttpHeaderAnalyzerOptions;

const defaultOptions: Options = {"security":true} as Options;

export function HttpHeaderAnalyzerToolView() {
  const [input, setInput] = useState("HTTP/2 200\ncontent-type: text/html\nserver: nginx/1.18.0\nset-cookie: sid=1; Path=/");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => analyzeHeaders(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.security} onChange={(e) => setOptions((o) => ({ ...o, security: e.target.checked }))} />
          Security review
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Response headers</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"HTTP/2 200\ncontent-type: text/html"}
                aria-label="Response headers"
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
