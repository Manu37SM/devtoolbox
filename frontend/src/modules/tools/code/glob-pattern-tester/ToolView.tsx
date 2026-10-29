"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { testGlobs } from "./transform";
import type { GlobPatternTesterOptions } from "./schema";

type Options = GlobPatternTesterOptions;

const defaultOptions: Options = {"mode":"glob","dot":false,"ignoreCase":false} as Options;

export function GlobPatternTesterToolView() {
  const [input, setInput] = useState("src/**/*.{ts,tsx}\n!src/**/*.test.ts\n---\nsrc/index.ts\nsrc/ui/Button.tsx\nsrc/ui/Button.test.ts\nlib/util.ts\nsrc/.hidden/x.ts");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => testGlobs(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Mode
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.mode}
            onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}
          >
            <option value="glob">{"Glob"}</option>
            <option value="gitignore">{".gitignore"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.dot} onChange={(e) => setOptions((o) => ({ ...o, dot: e.target.checked }))} />
          Match dotfiles
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.ignoreCase} onChange={(e) => setOptions((o) => ({ ...o, ignoreCase: e.target.checked }))} />
          Ignore case
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Patterns, then a line with ---, then paths</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="src/**/*.{ts,tsx}\n---\nsrc/a.ts"
                aria-label="Patterns, then a line with ---, then paths"
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
