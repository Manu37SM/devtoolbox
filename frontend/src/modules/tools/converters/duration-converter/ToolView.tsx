"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { convertDurations } from "./transform";
import type { DurationConverterOptions } from "./schema";

type Options = DurationConverterOptions;

const defaultOptions: Options = {"defaultUnit":"s"} as Options;

export function DurationConverterToolView() {
  const [input, setInput] = useState("1h 30m\n2 days 3 hours\n01:02:03\nPT36H\n90061");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertDurations(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Bare numbers are
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.defaultUnit}
            onChange={(e) => setOptions((o) => ({ ...o, defaultUnit: e.target.value as Options["defaultUnit"] }))}
          >
            <option value="ms">{"milliseconds"}</option>
            <option value="s">{"seconds"}</option>
            <option value="min">{"minutes"}</option>
            <option value="h">{"hours"}</option>
            <option value="d">{"days"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Durations (one per line)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="1h 30m"
                aria-label="Durations (one per line)"
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
