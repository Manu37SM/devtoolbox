"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { convertList } from "./transform";
import type { ListConverterOptions } from "./schema";

type Options = ListConverterOptions;

const defaultOptions: Options = {"mode":"lines-to-list","delimiter":"comma-space","quote":"none","wrapper":"none","sort":"none","trim":true,"skipEmpty":true,"dedupe":false} as Options;

export function ListConverterToolView() {
  const [input, setInput] = useState("apple\nbanana\ncherry");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertList(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["lines-to-list","Lines → List"],["list-to-lines","List → Lines"]] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={options.mode === value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, mode: value as Options["mode"] }))}
            >
              {label}
            </Button>
          ))}
        </div>
        {options.mode === "lines-to-list" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Delimiter
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.delimiter}
            onChange={(e) => setOptions((o) => ({ ...o, delimiter: e.target.value as Options["delimiter"] }))}
          >
            <option value="comma">{","}</option>
            <option value="comma-space">{", "}</option>
            <option value="semicolon">{";"}</option>
            <option value="pipe">{"|"}</option>
            <option value="tab">{"Tab"}</option>
            <option value="space">{"Space"}</option>
            <option value="newline">{"Newline"}</option>
          </select>
        </label>
        )}
        {options.mode === "lines-to-list" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Quote
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.quote}
            onChange={(e) => setOptions((o) => ({ ...o, quote: e.target.value as Options["quote"] }))}
          >
            <option value="none">{"None"}</option>
            <option value="single">{"'single'"}</option>
            <option value="double">{"\"double\""}</option>
            <option value="backtick">{"`backtick`"}</option>
          </select>
        </label>
        )}
        {options.mode === "lines-to-list" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Wrap
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.wrapper}
            onChange={(e) => setOptions((o) => ({ ...o, wrapper: e.target.value as Options["wrapper"] }))}
          >
            <option value="none">{"None"}</option>
            <option value="parens">{"( … )"}</option>
            <option value="brackets">{"[ … ]"}</option>
            <option value="sql-in">{"SQL IN ( … )"}</option>
            <option value="json-array">{"JSON array"}</option>
          </select>
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Sort
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.sort}
            onChange={(e) => setOptions((o) => ({ ...o, sort: e.target.value as Options["sort"] }))}
          >
            <option value="none">{"Original"}</option>
            <option value="asc">{"A → Z"}</option>
            <option value="desc">{"Z → A"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.trim} onChange={(e) => setOptions((o) => ({ ...o, trim: e.target.checked }))} />
          Trim
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.skipEmpty} onChange={(e) => setOptions((o) => ({ ...o, skipEmpty: e.target.checked }))} />
          Skip empty
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.dedupe} onChange={(e) => setOptions((o) => ({ ...o, dedupe: e.target.checked }))} />
          Dedupe
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="One value per line"
                aria-label="Input"
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
