"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { convertTable } from "./transform";
import { textTableOptionsSchema, type TextTableFromFormat, type TextTableOptions, type TextTableToFormat } from "./schema";

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
  { value: "html", label: "HTML" },
  { value: "json", label: "JSON" },
  { value: "jira", label: "Jira / Confluence" },
];

export function TextTableToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<TextTableOptions>(() => textTableOptionsSchema.parse({}));

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
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Align
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.align}
            onChange={(e) => setOptions((o) => ({ ...o, align: e.target.value as TextTableOptions["align"] }))}
          >
            <option value="none">Default</option>
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
            <option value="auto">Numbers right</option>
          </select>
        </label>
        {options.to === "markdown" && (
          <label className="flex items-center gap-1.5 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={options.padMarkdown}
              onChange={(e) => setOptions((o) => ({ ...o, padMarkdown: e.target.checked }))}
            />
            Pad columns
          </label>
        )}
        {options.to === "ascii" && (
          <label className="flex items-center gap-1.5 text-sm text-text-secondary">
            Style
            <select
              className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
              value={options.asciiStyle}
              onChange={(e) => setOptions((o) => ({ ...o, asciiStyle: e.target.value as TextTableOptions["asciiStyle"] }))}
            >
              <option value="unicode">Box ┌─┐</option>
              <option value="rounded">Rounded ╭─╮</option>
              <option value="double">Double ╔═╗</option>
              <option value="ascii">ASCII +-+</option>
              <option value="plain">Plain (column -t)</option>
            </select>
          </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.hasHeader}
            onChange={(e) => setOptions((o) => ({ ...o, hasHeader: e.target.checked }))}
          />
          First row is header
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.transpose}
            onChange={(e) => setOptions((o) => ({ ...o, transpose: e.target.checked }))}
          />
          Transpose
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <ToolInput value={input} onChange={(e) => setInput(e.target.value)} aria-label="Table input" />
            </div>
          }
          output={<OutputPane onSwap={() =>
            setOptions((o) =>
              o.to === "markdown" || o.to === "csv" || o.to === "tsv" ? { ...o, from: o.to, to: o.from } : o,
            )
          } value={result.output} error={result.error?.message ?? null} placeholder="Converted table will appear here" />}
        />
      </div>
    </div>
  );
}
