"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runEpochConverter } from "./transform";
import type { EpochFormatConverterOptions } from "./schema";

type Options = EpochFormatConverterOptions;

const defaultOptions: Options = {"from":"unix-s"} as Options;

export function EpochFormatConverterToolView() {
  const [input, setInput] = useState("1700000000");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runEpochConverter(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Input format
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.from}
            onChange={(e) => setOptions((o) => ({ ...o, from: e.target.value as Options["from"] }))}
          >
            <option value="unix-s">{"Unix seconds"}</option>
            <option value="unix-ms">{"Unix milliseconds"}</option>
            <option value="unix-us">{"Unix microseconds"}</option>
            <option value="unix-ns">{"Unix nanoseconds"}</option>
            <option value="windows-filetime">{"Windows FILETIME / LDAP"}</option>
            <option value="dotnet-ticks">{".NET ticks"}</option>
            <option value="excel-serial">{"Excel serial (1900)"}</option>
            <option value="apple-cocoa">{"Apple Cocoa"}</option>
            <option value="webkit">{"WebKit / Chrome"}</option>
            <option value="julian-day">{"Julian Day"}</option>
            <option value="gps-seconds">{"GPS seconds"}</option>
            <option value="iso">{"ISO 8601 date"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Timestamp</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="1700000000"
                aria-label="Timestamp"
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
