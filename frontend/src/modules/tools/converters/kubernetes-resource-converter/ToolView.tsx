"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { convertKubernetesResources } from "./transform";
import type { KubernetesResourceConverterOptions } from "./schema";

type Options = KubernetesResourceConverterOptions;

const defaultOptions: Options = {"kind":"auto"} as Options;

export function KubernetesResourceConverterToolView() {
  const [input, setInput] = useState("cpu: 250m\ncpu: 2\nmemory: 512Mi\nmemory: 1.5Gi\nmemory: 129e6");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertKubernetesResources(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Quantity type
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.kind}
            onChange={(e) => setOptions((o) => ({ ...o, kind: e.target.value as Options["kind"] }))}
          >
            <option value="auto">{"Auto-detect"}</option>
            <option value="cpu">{"CPU"}</option>
            <option value="memory">{"Memory"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Quantities (one per line, e.g. cpu: 250m)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"cpu: 250m\nmemory: 512Mi"}
                aria-label="Quantities (one per line, e.g. cpu: 250m)"
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
