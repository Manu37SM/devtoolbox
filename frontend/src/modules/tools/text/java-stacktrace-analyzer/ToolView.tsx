"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";


import { analyzeStacktrace } from "./transform";
import type { JavaStacktraceAnalyzerOptions } from "./schema";

type Options = JavaStacktraceAnalyzerOptions;

const defaultOptions: Options = {"appPackages":"com.","showFrames":true} as Options;

export function JavaStacktraceAnalyzerToolView() {
  const [input, setInput] = useState("java.lang.IllegalStateException: Failed to load ApplicationContext\n\tat org.springframework.test.context.cache.DefaultCacheAwareContextLoaderDelegate.loadContext(DefaultCacheAwareContextLoaderDelegate.java:180)\nCaused by: java.lang.NullPointerException: name is null\n\tat com.acme.OrderService.<init>(OrderService.java:42)\n\tat org.springframework.beans.BeanUtils.instantiateClass(BeanUtils.java:200)");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => analyzeStacktrace(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Your packages
          <input
            type="text"
            value={options.appPackages}
            placeholder="com.acme, org.mycorp"
            onChange={(e) => setOptions((o) => ({ ...o, appPackages: e.target.value }))}
            className="w-64 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showFrames} onChange={(e) => setOptions((o) => ({ ...o, showFrames: e.target.checked }))} />
          Show root-cause frames
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Stack trace</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder=""
                aria-label="Stack trace"
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
