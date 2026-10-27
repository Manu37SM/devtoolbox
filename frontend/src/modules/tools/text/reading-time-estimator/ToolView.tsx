"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";


import { estimateReading } from "./transform";
import type { ReadingTimeEstimatorOptions } from "./schema";

type Options = ReadingTimeEstimatorOptions;

const defaultOptions: Options = {"wpm":200,"stripMarkdown":false,"countImages":false} as Options;

export function ReadingTimeEstimatorToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => estimateReading(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Words per minute
          <input
            type="number"
            min={50} max={1000}
            value={options.wpm}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, wpm: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.stripMarkdown} onChange={(e) => setOptions((o) => ({ ...o, stripMarkdown: e.target.checked }))} />
          Ignore Markdown syntax/code
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.countImages} onChange={(e) => setOptions((o) => ({ ...o, countImages: e.target.checked }))} />
          Add time for images
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Text</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste your article…"
                aria-label="Text"
                
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
