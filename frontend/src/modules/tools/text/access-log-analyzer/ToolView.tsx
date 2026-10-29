"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { analyzeLog } from "./transform";
import type { AccessLogAnalyzerOptions } from "./schema";

type Options = AccessLogAnalyzerOptions;

const defaultOptions: Options = {"topN":10,"ignoreQuery":true} as Options;

export function AccessLogAnalyzerToolView() {
  const [input, setInput] = useState("203.0.113.5 - - [10/Oct/2023:13:55:36 +0000] \"GET /index.html?x=1 HTTP/1.1\" 200 2326 \"https://ref.example/\" \"Mozilla/5.0\"\n203.0.113.5 - - [10/Oct/2023:13:59:01 +0000] \"POST /api/login HTTP/1.1\" 401 120 \"-\" \"curl/8.0\"\n198.51.100.7 - - [10/Oct/2023:14:01:00 +0000] \"GET /index.html HTTP/2.0\" 200 2326 \"-\" \"Mozilla/5.0\"");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => analyzeLog(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Top N
          <input
            type="number"
            min={1} max={100}
            value={options.topN}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, topN: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.ignoreQuery} onChange={(e) => setOptions((o) => ({ ...o, ignoreQuery: e.target.checked }))} />
          Ignore query strings
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Access log lines</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"203.0.113.5 - - [10/Oct/2023:13:55:36 +0000] \"GET / HTTP/1.1\" 200 2326 \"-\" \"Mozilla/5.0\""}
                aria-label="Access log lines"
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
