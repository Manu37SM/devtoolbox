"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { findReplace } from "./transform";
import type { FindReplaceTextOptions } from "./schema";

type Options = FindReplaceTextOptions;

const defaultOptions: Options = {"find":"","replace":"","useRegex":false,"caseSensitive":false,"wholeWord":false} as Options;

export function FindReplaceTextToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => findReplace(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Find
          <input
            type="text"
            value={options.find}
            placeholder=""
            onChange={(e) => setOptions((o) => ({ ...o, find: e.target.value }))}
            className="w-64 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Replace
          <input
            type="text"
            value={options.replace}
            placeholder=""
            onChange={(e) => setOptions((o) => ({ ...o, replace: e.target.value }))}
            className="w-64 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.useRegex} onChange={(e) => setOptions((o) => ({ ...o, useRegex: e.target.checked }))} />
          Regex
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.caseSensitive} onChange={(e) => setOptions((o) => ({ ...o, caseSensitive: e.target.checked }))} />
          Match case
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.wholeWord} onChange={(e) => setOptions((o) => ({ ...o, wholeWord: e.target.checked }))} />
          Whole word
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder=""
                aria-label="Input"
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
