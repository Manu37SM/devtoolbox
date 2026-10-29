"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runJsonSortKeys } from "./transform";
import type { JsonSortKeysOptions } from "./schema";

type Options = JsonSortKeysOptions;

const defaultOptions: Options = {"order":"asc","deep":true,"caseInsensitive":false,"sortArrays":false,"indent":"2"} as Options;

export function JsonSortKeysToolView() {
  const [input, setInput] = useState("{\n  \"zebra\": 1,\n  \"Apple\": { \"y\": 2, \"x\": 1 },\n  \"item10\": true,\n  \"item2\": [3, 1, 2]\n}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runJsonSortKeys(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Order
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.order}
            onChange={(e) => setOptions((o) => ({ ...o, order: e.target.value as Options["order"] }))}
          >
            <option value="asc">{"A → Z"}</option>
            <option value="desc">{"Z → A"}</option>
            <option value="length">{"By length"}</option>
            <option value="natural">{"Natural"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.deep} onChange={(e) => setOptions((o) => ({ ...o, deep: e.target.checked }))} />
          Recursive
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.caseInsensitive} onChange={(e) => setOptions((o) => ({ ...o, caseInsensitive: e.target.checked }))} />
          Ignore case
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.sortArrays} onChange={(e) => setOptions((o) => ({ ...o, sortArrays: e.target.checked }))} />
          Sort primitive arrays
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Indent
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.indent}
            onChange={(e) => setOptions((o) => ({ ...o, indent: e.target.value as Options["indent"] }))}
          >
            <option value="2">{"2 spaces"}</option>
            <option value="4">{"4 spaces"}</option>
            <option value="tab">{"Tab"}</option>
            <option value="min">{"Minified"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">JSON</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"{\"b\":1,\"a\":2}"}
                aria-label="JSON"
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
