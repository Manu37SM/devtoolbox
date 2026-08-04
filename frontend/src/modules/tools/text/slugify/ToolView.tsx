"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { slugify } from "./transform";
import type { SlugifyOptions, SlugifySeparator } from "./schema";

const SEPARATORS: SlugifySeparator[] = ["-", "_"];

export function SlugifyToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<SlugifyOptions>({
    separator: "-",
    lowercase: true,
    transliterate: true,
  });
  const [maxLengthInput, setMaxLengthInput] = useState("");

  const result = useMemo(() => slugify(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          {SEPARATORS.map((sep) => (
            <Button
              key={sep}
              variant={options.separator === sep ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, separator: sep }))}
            >
              {sep === "-" ? "Hyphen" : "Underscore"}
            </Button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.lowercase}
            onChange={(e) => setOptions((o) => ({ ...o, lowercase: e.target.checked }))}
          />
          Lowercase
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.transliterate}
            onChange={(e) => setOptions((o) => ({ ...o, transliterate: e.target.checked }))}
          />
          Transliterate accents
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Max length
          <input
            type="number"
            min={1}
            value={maxLengthInput}
            onChange={(e) => {
              const raw = e.target.value;
              setMaxLengthInput(raw);
              const parsed = parseInt(raw, 10);
              setOptions((o) => ({
                ...o,
                maxLength: raw === "" || Number.isNaN(parsed) ? undefined : parsed,
              }));
            }}
            className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            placeholder="none"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea value={input} onChange={(e) => setInput(e.target.value)} aria-label="Text to slugify" />
            </div>
          }
          output={<OutputPane value={result.output} error={result.error?.message ?? null} placeholder="Slug will appear here" />}
        />
      </div>
    </div>
  );
}
