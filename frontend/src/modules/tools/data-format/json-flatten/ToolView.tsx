"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runJsonFlatten } from "./transform";
import type { JsonFlattenOptions } from "./schema";

type Options = JsonFlattenOptions;

const defaultOptions: Options = {"direction":"flatten","delimiter":".","arrays":"brackets","indent":"2"} as Options;

export function JsonFlattenToolView() {
  const [input, setInput] = useState("{\n  \"user\": { \"name\": \"Ada\", \"tags\": [\"admin\", \"dev\"], \"address\": { \"city\": \"London\" } },\n  \"active\": true\n}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runJsonFlatten(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Direction
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.direction}
            onChange={(e) => setOptions((o) => ({ ...o, direction: e.target.value as Options["direction"] }))}
          >
            <option value="flatten">{"Flatten"}</option>
            <option value="unflatten">{"Unflatten"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Delimiter
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.delimiter}
            onChange={(e) => setOptions((o) => ({ ...o, delimiter: e.target.value as Options["delimiter"] }))}
          >
            <option value=".">{"."}</option>
            <option value="/">{"/"}</option>
            <option value="_">{"_"}</option>
            <option value=":">{":"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Arrays
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.arrays}
            onChange={(e) => setOptions((o) => ({ ...o, arrays: e.target.value as Options["arrays"] }))}
          >
            <option value="brackets">{"a[0]"}</option>
            <option value="delimited">{"a.0"}</option>
          </select>
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
                placeholder={"{\"a\":{\"b\":[1,2]}}"}
                aria-label="JSON"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane onSwap={() => setOptions((o) => ({ ...o, direction: o.direction === "flatten" ? "unflatten" : o.direction === "unflatten" ? "flatten" : o.direction }))} label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
