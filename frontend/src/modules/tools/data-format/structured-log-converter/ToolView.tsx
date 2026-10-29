"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runStructuredLogConverter } from "./transform";
import type { StructuredLogConverterOptions } from "./schema";

type Options = StructuredLogConverterOptions;

const defaultOptions: Options = {"output":"pretty","minLevel":"all"} as Options;

export function StructuredLogConverterToolView() {
  const [input, setInput] = useState("{\"level\":30,\"time\":1706695200000,\"msg\":\"server started\",\"port\":8080}\ntime=2024-01-31T10:00:01Z level=error msg=\"db down\" err=\"connection refused\" retry=3\n{\"@timestamp\":\"2024-01-31T10:00:02Z\",\"log\":{\"level\":\"warn\"},\"message\":\"slow query\",\"event\":{\"duration\":1200}}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runStructuredLogConverter(input, options), [input, options]);

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
            <option value="pretty">{"Readable"}</option>
            <option value="json">{"JSON lines"}</option>
            <option value="logfmt">{"logfmt"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Minimum level
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.minLevel}
            onChange={(e) => setOptions((o) => ({ ...o, minLevel: e.target.value as Options["minLevel"] }))}
          >
            <option value="all">{"All"}</option>
            <option value="debug">{"Debug"}</option>
            <option value="info">{"Info"}</option>
            <option value="warn">{"Warn"}</option>
            <option value="error">{"Error"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Log lines</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="level=info msg=started"
                aria-label="Log lines"
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
