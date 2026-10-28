"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { formatGraphql } from "./transform";
import type { GraphqlFormatterOptions } from "./schema";

type Options = GraphqlFormatterOptions;

const defaultOptions: Options = {"mode":"format","indent":"2"} as Options;

export function GraphqlFormatterToolView() {
  const [input, setInput] = useState("query GetUser($id: ID!) { user(id: $id) { id name posts(first: 5) { edges { node { title } } } } }");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => formatGraphql(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Mode
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.mode}
            onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}
          >
            <option value="format">{"Format"}</option>
            <option value="minify">{"Minify"}</option>
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
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">GraphQL</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="query { user(id: 1) { name } }"
                aria-label="GraphQL"
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
