"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { generateGitignore } from "./transform";
import type { GitignoreGeneratorOptions } from "./schema";

type Options = GitignoreGeneratorOptions;

const defaultOptions: Options = {"dedupe":true} as Options;

export function GitignoreGeneratorToolView() {
  const [input, setInput] = useState("java, maven, spring, intellij, vscode, macos, windows, env");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateGitignore(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.dedupe} onChange={(e) => setOptions((o) => ({ ...o, dedupe: e.target.checked }))} />
          Remove duplicate patterns
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Templates (comma or space separated)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="node, java, maven, intellij, macos"
                aria-label="Templates (comma or space separated)"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane label=".gitignore" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
