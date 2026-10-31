"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { columnExtractor } from "./transform";
import type { ColumnExtractorOptions } from "./schema";

type Options = ColumnExtractorOptions;

const defaultOptions: Options = {"split": "whitespace", "delimiterText": "", "columns": "1", "mode": "keep", "outputSeparator": "same", "outputCustom": "", "respectQuotes": false, "trim": true, "skipEmptyLines": true, "skipLines": 0, "missing": "empty", "deduplicate": false} as Options;

export function ColumnExtractorToolView() {
  const [in0, setIn0] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => columnExtractor(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Split on"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.split} onChange={(e) => setOptions((o) => ({ ...o, split: e.target.value as Options["split"] }))}>
            <option value={"whitespace"}>{"Whitespace (awk)"}</option>
            <option value={"space"}>{"Single space"}</option>
            <option value={"tab"}>{"Tab"}</option>
            <option value={"comma"}>{"Comma"}</option>
            <option value={"semicolon"}>{"Semicolon"}</option>
            <option value={"pipe"}>{"Pipe"}</option>
            <option value={"colon"}>{"Colon"}</option>
            <option value={"regex"}>{"Regex"}</option>
            <option value={"custom"}>{"Custom text"}</option>
            <option value={"chars"}>{"Characters (cut -c)"}</option>
          </select>
        </label>
        {["regex", "custom"].includes(String(options.split)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Delimiter"}
          <input type="text" value={options.delimiterText} placeholder={"::"} onChange={(e) => setOptions((o) => ({ ...o, delimiterText: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Columns"}
          <input type="text" value={options.columns} placeholder={"1,3-5,~1"} onChange={(e) => setOptions((o) => ({ ...o, columns: e.target.value }))} className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Mode"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.mode} onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}>
            <option value={"keep"}>{"Keep"}</option>
            <option value={"drop"}>{"Drop"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Join with"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.outputSeparator} onChange={(e) => setOptions((o) => ({ ...o, outputSeparator: e.target.value as Options["outputSeparator"] }))}>
            <option value={"same"}>{"Same as input"}</option>
            <option value={"space"}>{"Space"}</option>
            <option value={"tab"}>{"Tab"}</option>
            <option value={"comma"}>{"Comma"}</option>
            <option value={"semicolon"}>{"Semicolon"}</option>
            <option value={"pipe"}>{"Pipe"}</option>
            <option value={"custom"}>{"Custom\u2026"}</option>
          </select>
        </label>
        {["custom"].includes(String(options.outputSeparator)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Joiner"}
          <input type="text" value={options.outputCustom} placeholder={" | "} onChange={(e) => setOptions((o) => ({ ...o, outputCustom: e.target.value }))} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Short lines"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.missing} onChange={(e) => setOptions((o) => ({ ...o, missing: e.target.value as Options["missing"] }))}>
            <option value={"empty"}>{"Leave blank"}</option>
            <option value={"omit"}>{"Omit column"}</option>
            <option value={"skip-line"}>{"Skip line"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Skip first"}
          <input type="number" min={0} max={1000} value={options.skipLines} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, skipLines: Math.min(1000, Math.max(0, n)) })); }} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.respectQuotes} onChange={(e) => setOptions((o) => ({ ...o, respectQuotes: e.target.checked }))} />
          {"Respect \"quotes\""}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.trim} onChange={(e) => setOptions((o) => ({ ...o, trim: e.target.checked }))} />
          {"Trim"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.skipEmptyLines} onChange={(e) => setOptions((o) => ({ ...o, skipEmptyLines: e.target.checked }))} />
          {"Skip empty lines"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.deduplicate} onChange={(e) => setOptions((o) => ({ ...o, deduplicate: e.target.checked }))} />
          {"Remove duplicates"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Input text"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"ls -l output, CSV rows, log lines\u2026"}
                  aria-label={"Input text"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Columns"} value={result.output} error={result.error?.message ?? null} placeholder={"Result will appear here"} />}
        />
      </div>
    </div>
  );
}
