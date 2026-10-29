"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runJsonToOpenapiSchema } from "./transform";
import type { JsonToOpenapiSchemaOptions } from "./schema";

type Options = JsonToOpenapiSchemaOptions;

const defaultOptions: Options = {"version":"3.1","output":"schema","method":"post","format":"yaml","includeExamples":true} as Options;

export function JsonToOpenapiSchemaToolView() {
  const [input, setInput] = useState("name: Order\npath: /v1/orders\n{\"id\": 3000000123, \"email\": \"ann@example.com\", \"total\": 125.5, \"placedAt\": \"2024-01-31T10:00:00Z\", \"note\": null,\n \"items\": [{\"sku\": \"AB12\", \"qty\": 2}, {\"sku\": \"CD34\", \"qty\": 1, \"gift\": true}]}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runJsonToOpenapiSchema(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          OpenAPI
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.version}
            onChange={(e) => setOptions((o) => ({ ...o, version: e.target.value as Options["version"] }))}
          >
            <option value="3.1">{"3.1"}</option>
            <option value="3.0">{"3.0"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.output}
            onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}
          >
            <option value="schema">{"Components only"}</option>
            <option value="spec">{"Full spec with path"}</option>
          </select>
        </label>
        {options.output === "spec" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Method
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.method}
            onChange={(e) => setOptions((o) => ({ ...o, method: e.target.value as Options["method"] }))}
          >
            <option value="post">{"POST"}</option>
            <option value="get">{"GET"}</option>
            <option value="put">{"PUT"}</option>
            <option value="patch">{"PATCH"}</option>
          </select>
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Format
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.format}
            onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}
          >
            <option value="yaml">{"YAML"}</option>
            <option value="json">{"JSON"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.includeExamples} onChange={(e) => setOptions((o) => ({ ...o, includeExamples: e.target.checked }))} />
          Examples
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">JSON sample (optional first lines: name: Order, path: /v1/orders)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"{\"id\": 1}"}
                aria-label="JSON sample (optional first lines: name: Order, path: /v1/orders)"
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
