"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runLineTools } from "./transform";
import type { LineToolsOptions } from "./schema";

type Options = LineToolsOptions;

const defaultOptions: Options = {"operation":"number","param":"1","param2":"","useRegex":false,"ignoreCase":false,"width":80} as Options;

export function LineToolsToolView() {
  const [input, setInput] = useState("apple\nbanana\ncherry");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runLineTools(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Operation
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.operation}
            onChange={(e) => setOptions((o) => ({ ...o, operation: e.target.value as Options["operation"] }))}
          >
            <option value="number">{"Number lines"}</option>
            <option value="prefix-suffix">{"Prefix / suffix"}</option>
            <option value="join">{"Join lines"}</option>
            <option value="split">{"Split on delimiter"}</option>
            <option value="reverse-order">{"Reverse order"}</option>
            <option value="trim">{"Trim each line"}</option>
            <option value="remove-blank">{"Remove blank lines"}</option>
            <option value="keep-matching">{"Keep matching"}</option>
            <option value="remove-matching">{"Remove matching"}</option>
            <option value="wrap">{"Wrap to width"}</option>
            <option value="indent">{"Indent"}</option>
            <option value="dedent">{"Dedent"}</option>
            <option value="column">{"Extract column"}</option>
          </select>
        </label>
        {options.operation === "number" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Start at
          <input
            type="text"
            value={options.param}
            onChange={(e) => setOptions((o) => ({ ...o, param: e.target.value }))}
            placeholder="1"
            aria-label="Start at"
            className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        )}
        {options.operation === "number" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Separator
          <input
            type="text"
            value={options.param2}
            onChange={(e) => setOptions((o) => ({ ...o, param2: e.target.value }))}
            placeholder=". "
            aria-label="Separator"
            className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        )}
        {options.operation === "prefix-suffix" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Prefix
          <input
            type="text"
            value={options.param}
            onChange={(e) => setOptions((o) => ({ ...o, param: e.target.value }))}
            placeholder="- "
            aria-label="Prefix"
            className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        )}
        {options.operation === "prefix-suffix" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Suffix
          <input
            type="text"
            value={options.param2}
            onChange={(e) => setOptions((o) => ({ ...o, param2: e.target.value }))}
            placeholder=","
            aria-label="Suffix"
            className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        )}
        {options.operation === "join" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Joiner
          <input
            type="text"
            value={options.param}
            onChange={(e) => setOptions((o) => ({ ...o, param: e.target.value }))}
            placeholder=", "
            aria-label="Joiner"
            className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        )}
        {options.operation === "split" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Delimiter
          <input
            type="text"
            value={options.param}
            onChange={(e) => setOptions((o) => ({ ...o, param: e.target.value }))}
            placeholder=","
            aria-label="Delimiter"
            className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        )}
        {options.operation === "keep-matching" || options.operation === "remove-matching" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Text or pattern
          <input
            type="text"
            value={options.param}
            onChange={(e) => setOptions((o) => ({ ...o, param: e.target.value }))}
            placeholder="error"
            aria-label="Text or pattern"
            className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        )}
        {options.operation === "keep-matching" || options.operation === "remove-matching" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.useRegex} onChange={(e) => setOptions((o) => ({ ...o, useRegex: e.target.checked }))} />
          Regex
        </label>
        )}
        {options.operation === "keep-matching" || options.operation === "remove-matching" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.ignoreCase} onChange={(e) => setOptions((o) => ({ ...o, ignoreCase: e.target.checked }))} />
          Ignore case
        </label>
        )}
        {options.operation === "wrap" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Width
          <input
            type="number"
            min={1} max={500}
            value={options.width}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, width: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        )}
        {options.operation === "indent" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Spaces
          <input
            type="text"
            value={options.param}
            onChange={(e) => setOptions((o) => ({ ...o, param: e.target.value }))}
            placeholder="2"
            aria-label="Spaces"
            className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        )}
        {options.operation === "column" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Column number
          <input
            type="text"
            value={options.param}
            onChange={(e) => setOptions((o) => ({ ...o, param: e.target.value }))}
            placeholder="1"
            aria-label="Column number"
            className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        )}
        {options.operation === "column" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Separator (blank = spaces)
          <input
            type="text"
            value={options.param2}
            onChange={(e) => setOptions((o) => ({ ...o, param2: e.target.value }))}
            placeholder=","
            aria-label="Separator (blank = spaces)"
            className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Lines</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="one item per line"
                aria-label="Lines"
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
