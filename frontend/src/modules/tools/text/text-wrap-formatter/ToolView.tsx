"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { formatTextWrap } from "./transform";
import type { TextWrapFormatterOptions } from "./schema";

type Options = TextWrapFormatterOptions;

const defaultOptions: Options = {"mode": "wrap", "width": 80, "align": "left", "firstIndent": 0, "hangingIndent": 0, "prefix": "", "detectPrefix": true, "joinLines": true, "breakLongWords": false} as Options;

export function TextWrapFormatterToolView() {
  const [in0, setIn0] = useState("// This function retries the request with exponential backoff, but only when the failure is transient and the operation is idempotent.\n//\n// Callers must not wrap it in another retry loop.");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => formatTextWrap(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Mode"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.mode} onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}>
            <option value="wrap">{"Wrap"}</option>
            <option value="unwrap">{"Unwrap"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Width"}
          <input type="number" min={10} max={500} value={options.width} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, width: Math.min(500, Math.max(10, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Align"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.align} onChange={(e) => setOptions((o) => ({ ...o, align: e.target.value as Options["align"] }))}>
            <option value="left">{"Left"}</option>
            <option value="right">{"Right"}</option>
            <option value="center">{"Center"}</option>
            <option value="justify">{"Justify"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"First indent"}
          <input type="number" min={0} max={40} value={options.firstIndent} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, firstIndent: Math.min(40, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Hanging indent"}
          <input type="number" min={0} max={40} value={options.hangingIndent} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, hangingIndent: Math.min(40, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Prefix"}
          <input type="text" value={options.prefix} placeholder={"// or > "} onChange={(e) => setOptions((o) => ({ ...o, prefix: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.detectPrefix} onChange={(e) => setOptions((o) => ({ ...o, detectPrefix: e.target.checked }))} />
          {"Detect comment prefix"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.joinLines} onChange={(e) => setOptions((o) => ({ ...o, joinLines: e.target.checked }))} />
          {"Join lines first"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.breakLongWords} onChange={(e) => setOptions((o) => ({ ...o, breakLongWords: e.target.checked }))} />
          {"Break long words"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Text"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"Paste text or a comment block"}
                  aria-label={"Text"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Wrapped text"} value={result.output} error={result.error?.message ?? null} placeholder={"Wrapped text will appear here"} />}
        />
      </div>
    </div>
  );
}
