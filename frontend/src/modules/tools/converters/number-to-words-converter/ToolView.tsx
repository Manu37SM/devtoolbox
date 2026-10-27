"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { convertNumberWords } from "./transform";
import type { NumberToWordsOptions } from "./schema";

export function NumberToWordsConverterToolView() {
  const [input, setInput] = useState("1234");
  const [options, setOptions] = useState<NumberToWordsOptions>({ mode: "to-words", style: "cardinal", useAnd: false });

  const result = useMemo(() => convertNumberWords(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          {(
            [
              ["to-words", "Number → Words"],
              ["to-number", "Words → Number"],
            ] as const
          ).map(([mode, label]) => (
            <Button
              key={mode}
              variant={options.mode === mode ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, mode }))}
            >
              {label}
            </Button>
          ))}
        </div>
        {options.mode === "to-words" && (
          <>
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              Style
              <select
                className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
                value={options.style}
                onChange={(e) => setOptions((o) => ({ ...o, style: e.target.value as NumberToWordsOptions["style"] }))}
              >
                <option value="cardinal">Cardinal (twenty-one)</option>
                <option value="ordinal">Ordinal (twenty-first)</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={options.useAnd}
                onChange={(e) => setOptions((o) => ({ ...o, useAnd: e.target.checked }))}
              />
              British “and”
            </label>
          </>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={options.mode === "to-words" ? "e.g. 1234 or -3.14" : "e.g. one thousand two hundred thirty-four"}
                aria-label="Number or words input"
              />
            </div>
          }
          output={<OutputPane value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
