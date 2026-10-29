"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { wordFrequency } from "./transform";
import type { WordFrequencyOptions } from "./schema";

type Options = WordFrequencyOptions;

const defaultOptions: Options = {"sortBy":"count","topN":0,"minLength":1,"ignoreStopWords":false,"caseSensitive":false} as Options;

export function WordFrequencyToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => wordFrequency(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Sort
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.sortBy}
            onChange={(e) => setOptions((o) => ({ ...o, sortBy: e.target.value as Options["sortBy"] }))}
          >
            <option value="count">{"By count"}</option>
            <option value="alpha">{"Alphabetical"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Top N (0 = all)
          <input
            type="number"
            min={0} max={10000}
            value={options.topN}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, topN: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Min length
          <input
            type="number"
            min={1} max={50}
            value={options.minLength}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, minLength: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.ignoreStopWords} onChange={(e) => setOptions((o) => ({ ...o, ignoreStopWords: e.target.checked }))} />
          Ignore stop words
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.caseSensitive} onChange={(e) => setOptions((o) => ({ ...o, caseSensitive: e.target.checked }))} />
          Match case
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder=""
                aria-label="Input"
                
              />
            </div>
          }
          output={<OutputPane label="Frequencies" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
