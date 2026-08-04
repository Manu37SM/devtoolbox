"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { convertTable } from "./transform";
import type { TextTableFromFormat, TextTableOptions, TextTableToFormat } from "./schema";

const FROM_OPTIONS: { value: TextTableFromFormat; label: string }[] = [
  { value: "csv", label: "CSV" },
  { value: "tsv", label: "TSV" },
  { value: "markdown", label: "Markdown" },
];

const TO_OPTIONS: { value: TextTableToFormat; label: string }[] = [
  { value: "markdown", label: "Markdown" },
  { value: "csv", label: "CSV" },
  { value: "tsv", label: "TSV" },
  { value: "ascii", label: "ASCII" },
];

export function TextTableToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<TextTableOptions>({ from: "csv", to: "markdown" });

  const result = useMemo(() => convertTable(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          From
          <select
            value={options.from}
            onChange={(e) => setOptions((o) => ({ ...o, from: e.target.value as TextTableFromFormat }))}
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            aria-label="Source format"
          >
            {FROM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          To
          <select
            value={options.to}
            onChange={(e) => setOptions((o) => ({ ...o, to: e.target.value as TextTableToFormat }))}
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            aria-label="Target format"
          >
            {TO_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea value={input} onChange={(e) => setInput(e.target.value)} aria-label="Table input" />
            </div>
          }
          output={<OutputPane value={result.output} error={result.error?.message ?? null} placeholder="Converted table will appear here" />}
        />
      </div>
    </div>
  );
}
