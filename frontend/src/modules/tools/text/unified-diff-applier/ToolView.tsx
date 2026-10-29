"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runUnifiedDiffApplier } from "./transform";
import type { UnifiedDiffApplierOptions } from "./schema";

type Options = UnifiedDiffApplierOptions;

const defaultOptions: Options = {"output":"result","reverse":false,"ignoreWhitespace":false} as Options;

export function UnifiedDiffApplierToolView() {
  const [input, setInput] = useState("server:\n  port: 8080\nspring:\n  datasource:\n    url: jdbc:postgresql://localhost/app\n    hikari:\n      maximum-pool-size: 10\n");
  const [input2, setInput2] = useState("--- a/application.yml\n+++ b/application.yml\n@@ -1,2 +1,2 @@\n server:\n-  port: 8080\n+  port: 8443\n@@ -6,2 +6,3 @@\n     hikari:\n       maximum-pool-size: 10\n+      connection-timeout: 5000\n");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runUnifiedDiffApplier(input, input2, options), [input, input2, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.output}
            onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}
          >
            <option value="result">{"Patched text"}</option>
            <option value="report">{"Report + text"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.reverse} onChange={(e) => setOptions((o) => ({ ...o, reverse: e.target.checked }))} />
          Reverse (unapply)
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.ignoreWhitespace} onChange={(e) => setOptions((o) => ({ ...o, ignoreWhitespace: e.target.checked }))} />
          Ignore whitespace
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Original text</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Original file contents"
                aria-label="Original text"
                className="font-mono h-auto min-h-[120px] flex-1"
              />
              <label className="text-sm font-medium text-text-secondary">Unified diff</label>
              <ToolInput
                value={input2}
                onChange={(e) => setInput2(e.target.value)}
                placeholder="@@ -1,3 +1,3 @@"
                aria-label="Unified diff"
                className="h-auto min-h-[120px] flex-1 font-mono"
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
