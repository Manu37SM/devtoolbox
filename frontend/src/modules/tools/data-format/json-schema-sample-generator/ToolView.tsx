"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { generateJsonSample } from "./transform";
import type { JsonSchemaSampleGeneratorOptions } from "./schema";

type Options = JsonSchemaSampleGeneratorOptions;

const defaultOptions: Options = {"fill": "all", "useExamples": true, "smartValues": true, "arrayLength": 2, "variant": 0, "seed": 1, "count": 1, "maxDepth": 5, "format": "pretty"} as Options;

export function JsonSchemaSampleGeneratorToolView() {
  const [in0, setIn0] = useState("{\n  \"type\": \"object\",\n  \"required\": [\"id\", \"email\"],\n  \"properties\": {\n    \"id\": { \"type\": \"string\", \"format\": \"uuid\" },\n    \"firstName\": { \"type\": \"string\" },\n    \"email\": { \"type\": \"string\", \"format\": \"email\" },\n    \"age\": { \"type\": \"integer\", \"minimum\": 18, \"maximum\": 65 },\n    \"tags\": { \"type\": \"array\", \"items\": { \"type\": \"string\" }, \"maxItems\": 3 }\n  }\n}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateJsonSample(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Properties"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.fill} onChange={(e) => setOptions((o) => ({ ...o, fill: e.target.value as Options["fill"] }))}>
            <option value={"all"}>{"All"}</option>
            <option value={"required"}>{"Required only"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.useExamples} onChange={(e) => setOptions((o) => ({ ...o, useExamples: e.target.checked }))} />
          {"Use defaults/examples"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.smartValues} onChange={(e) => setOptions((o) => ({ ...o, smartValues: e.target.checked }))} />
          {"Realistic values"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Array items"}
          <input type="number" min={0} max={20} value={options.arrayLength} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, arrayLength: Math.min(20, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"oneOf branch"}
          <input type="number" min={0} max={50} value={options.variant} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, variant: Math.min(50, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Seed"}
          <input type="number" min={0} max={2147483647} value={options.seed} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, seed: Math.min(2147483647, Math.max(0, n)) })); }} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Samples"}
          <input type="number" min={1} max={100} value={options.count} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, count: Math.min(100, Math.max(1, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Max depth"}
          <input type="number" min={1} max={12} value={options.maxDepth} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, maxDepth: Math.min(12, Math.max(1, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Format"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.format} onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}>
            <option value={"pretty"}>{"Pretty"}</option>
            <option value={"compact"}>{"Compact"}</option>
            <option value={"ndjson"}>{"NDJSON"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"JSON Schema"}</label>
                <ToolInput
                  as="code"
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  language="json"
                  placeholder={"{ \"type\": \"object\", ... }"}
                  aria-label={"JSON Schema"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Sample JSON"} value={result.output} error={result.error?.message ?? null} placeholder={"Sample will appear here"} />}
        />
      </div>
    </div>
  );
}
