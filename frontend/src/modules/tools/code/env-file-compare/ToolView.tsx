"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { compareEnvFiles } from "./transform";
import type { EnvFileCompareOptions } from "./schema";

type Options = EnvFileCompareOptions;

const defaultOptions: Options = {"showValues":false,"showSame":false} as Options;

export function EnvFileCompareToolView() {
  const [input, setInput] = useState("DATABASE_URL=postgres://localhost/app\nPORT=3000\nSECRET_KEY=abc123\nDEBUG=true\n---\nDATABASE_URL=postgres://prod/app\nPORT=3000\nSENTRY_DSN=https://x@y/1\nDEBUG=false");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => compareEnvFiles(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showValues} onChange={(e) => setOptions((o) => ({ ...o, showValues: e.target.checked }))} />
          Show values
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showSame} onChange={(e) => setOptions((o) => ({ ...o, showSame: e.target.checked }))} />
          List identical keys
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">File A, a line containing only ---, then file B</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"A=1\n---\nA=2"}
                aria-label="File A, a line containing only ---, then file B"
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
