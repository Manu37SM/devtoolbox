"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { generatePlaceholderText } from "./transform";
import type { PlaceholderTextOptions, PlaceholderTextUnit, PlaceholderTextVariant } from "./schema";

const defaultOptions: PlaceholderTextOptions = { variant: "hipster", unit: "paragraphs", count: 3 };

export function PlaceholderTextGeneratorToolView() {
  const [options, setOptions] = useState<PlaceholderTextOptions>(defaultOptions);
  const [nonce, setNonce] = useState(0);
  const patch = (p: Partial<PlaceholderTextOptions>) => setOptions((o) => ({ ...o, ...p }));

  const result = useMemo(() => generatePlaceholderText(options), [options, nonce]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Style
          <select
            value={options.variant}
            onChange={(e) => patch({ variant: e.target.value as PlaceholderTextVariant })}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-2"
          >
            <option value="hipster">Hipster ipsum</option>
            <option value="corporate">Corporate ipsum</option>
            <option value="bacon">Bacon ipsum</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Unit
          <select
            value={options.unit}
            onChange={(e) => patch({ unit: e.target.value as PlaceholderTextUnit })}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-2"
          >
            <option value="words">Words</option>
            <option value="sentences">Sentences</option>
            <option value="paragraphs">Paragraphs</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Count
          <input
            type="number"
            min={1}
            max={50}
            value={options.count}
            onChange={(e) => patch({ count: Number(e.target.value) })}
            className="w-20 rounded-sm border border-border-default bg-bg-raised px-2 py-2 font-mono text-sm"
            aria-label="Count"
          />
        </label>
        <button
          type="button"
          onClick={() => setNonce((n) => n + 1)}
          className="rounded-sm border border-border-default bg-bg-raised px-3 py-2 text-sm text-text-secondary"
        >
          Regenerate
        </button>
      </div>

      <div className="min-h-[200px] flex-1">
        <OutputPane
          value={result.output}
          error={result.error?.message ?? null}
          label="Generated text"
          placeholder="Generated placeholder text will appear here"
        />
      </div>
    </div>
  );
}
