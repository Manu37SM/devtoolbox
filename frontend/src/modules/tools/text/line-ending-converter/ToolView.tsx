"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { lineEndingConverter } from "./transform";
import type { LineEndingConverterOptions } from "./schema";

type Options = LineEndingConverterOptions;

const defaultOptions: Options = {"eol": "lf", "bom": "remove", "trimTrailing": true, "finalNewline": "add", "tabsToSpaces": "none", "spacesToTabs": false, "tabWidth": 4, "maxBlankLines": 0, "removeInvisible": false, "normalizeSpaces": false, "removeControl": false, "output": "text"} as Options;

export function LineEndingConverterToolView() {
  const [in0, setIn0] = useState("line one  \r\n\tindented\r\n\r\n\r\nlast");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => lineEndingConverter(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Line ending"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.eol} onChange={(e) => setOptions((o) => ({ ...o, eol: e.target.value as Options["eol"] }))}>
            <option value={"lf"}>{"LF (Unix)"}</option>
            <option value={"crlf"}>{"CRLF (Windows)"}</option>
            <option value={"cr"}>{"CR (old Mac)"}</option>
            <option value={"keep"}>{"Keep"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"BOM"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.bom} onChange={(e) => setOptions((o) => ({ ...o, bom: e.target.value as Options["bom"] }))}>
            <option value={"remove"}>{"Remove"}</option>
            <option value={"add"}>{"Add"}</option>
            <option value={"keep"}>{"Keep"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Final newline"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.finalNewline} onChange={(e) => setOptions((o) => ({ ...o, finalNewline: e.target.value as Options["finalNewline"] }))}>
            <option value={"add"}>{"Ensure one"}</option>
            <option value={"single"}>{"Exactly one"}</option>
            <option value={"remove"}>{"None"}</option>
            <option value={"keep"}>{"Keep"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Tabs \u2192 spaces"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.tabsToSpaces} onChange={(e) => setOptions((o) => ({ ...o, tabsToSpaces: e.target.value as Options["tabsToSpaces"] }))}>
            <option value={"none"}>{"No"}</option>
            <option value={"leading"}>{"Indentation only"}</option>
            <option value={"all"}>{"Every tab"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Tab width"}
          <input type="number" min={1} max={16} step={1} value={options.tabWidth} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, tabWidth: Math.min(16, Math.max(1, n)) })); }} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Max blank lines (0 = off)"}
          <input type="number" min={0} max={20} step={1} value={options.maxBlankLines} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, maxBlankLines: Math.min(20, Math.max(0, n)) })); }} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.trimTrailing} onChange={(e) => setOptions((o) => ({ ...o, trimTrailing: e.target.checked }))} />
          {"Trim trailing whitespace"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.spacesToTabs} onChange={(e) => setOptions((o) => ({ ...o, spacesToTabs: e.target.checked }))} />
          {"Indent spaces \u2192 tabs"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.removeInvisible} onChange={(e) => setOptions((o) => ({ ...o, removeInvisible: e.target.checked }))} />
          {"Strip zero-width/invisible"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.normalizeSpaces} onChange={(e) => setOptions((o) => ({ ...o, normalizeSpaces: e.target.checked }))} />
          {"Normalize NBSP & exotic spaces"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.removeControl} onChange={(e) => setOptions((o) => ({ ...o, removeControl: e.target.checked }))} />
          {"Strip control chars"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Show"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.output} onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}>
            <option value={"text"}>{"Converted text"}</option>
            <option value={"report"}>{"Report only"}</option>
            <option value={"text-and-report"}>{"Text + report"}</option>
          </select>
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
                  placeholder={"Paste text or code\u2026"}
                  aria-label={"Text"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Result"} fileName={"converted.txt"} value={result.output} error={result.error?.message ?? null} placeholder={"Converted text appears here"} />}
        />
      </div>
    </div>
  );
}
