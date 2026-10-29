"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { generateEditorconfig } from "./transform";
import type { EditorconfigGeneratorOptions } from "./schema";

type Options = EditorconfigGeneratorOptions;

const defaultOptions: Options = {"indentStyle":"space","indentSize":2,"endOfLine":"lf","charset":"utf-8","trimTrailing":true,"finalNewline":true,"maxLineLength":0,"perLanguage":true} as Options;

export function EditorconfigGeneratorToolView() {
  const [input, setInput] = useState("java js py go md make");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateEditorconfig(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Indent
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.indentStyle}
            onChange={(e) => setOptions((o) => ({ ...o, indentStyle: e.target.value as Options["indentStyle"] }))}
          >
            <option value="space">{"Spaces"}</option>
            <option value="tab">{"Tabs"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Size
          <input
            type="number"
            min={1} max={8}
            value={options.indentSize}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, indentSize: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Line endings
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.endOfLine}
            onChange={(e) => setOptions((o) => ({ ...o, endOfLine: e.target.value as Options["endOfLine"] }))}
          >
            <option value="lf">{"LF"}</option>
            <option value="crlf">{"CRLF"}</option>
            <option value="cr">{"CR"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Charset
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.charset}
            onChange={(e) => setOptions((o) => ({ ...o, charset: e.target.value as Options["charset"] }))}
          >
            <option value="utf-8">{"UTF-8"}</option>
            <option value="utf-8-bom">{"UTF-8 BOM"}</option>
            <option value="latin1">{"Latin-1"}</option>
            <option value="utf-16be">{"UTF-16 BE"}</option>
            <option value="utf-16le">{"UTF-16 LE"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.trimTrailing} onChange={(e) => setOptions((o) => ({ ...o, trimTrailing: e.target.checked }))} />
          Trim trailing whitespace
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.finalNewline} onChange={(e) => setOptions((o) => ({ ...o, finalNewline: e.target.checked }))} />
          Final newline
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Max line length (0 = off)
          <input
            type="number"
            min={0} max={400}
            value={options.maxLineLength}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, maxLineLength: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.perLanguage} onChange={(e) => setOptions((o) => ({ ...o, perLanguage: e.target.checked }))} />
          Per-language overrides
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Languages (java js py go rs md yaml json make bat sh)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="java js go md"
                aria-label="Languages (java js py go rs md yaml json make bat sh)"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
