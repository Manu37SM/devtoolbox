"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runReadability } from "./transform";
import type { ReadabilityAnalyzerOptions } from "./schema";

type Options = ReadabilityAnalyzerOptions;

const defaultOptions: Options = {"showFormulas":false} as Options;

export function ReadabilityAnalyzerToolView() {
  const [input, setInput] = useState("The quick brown fox jumps over the lazy dog. Short sentences are easy to read. Complicated multisyllabic terminology, however, substantially increases comprehension difficulty for most audiences.");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runReadability(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showFormulas} onChange={(e) => setOptions((o) => ({ ...o, showFormulas: e.target.checked }))} />
          Show formulas
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Text to analyze</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste your text here..."
                aria-label="Text to analyze"
                className=""
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
