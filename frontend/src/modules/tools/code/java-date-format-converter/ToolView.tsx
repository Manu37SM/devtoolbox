"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { convertDateFormat } from "./transform";
import type { JavaDateFormatConverterOptions } from "./schema";

type Options = JavaDateFormatConverterOptions;

const defaultOptions: Options = {"from":"java","showSample":true} as Options;

export function JavaDateFormatConverterToolView() {
  const [input, setInput] = useState("yyyy-MM-dd'T'HH:mm:ss.SSSXXX");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertDateFormat(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Source format
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.from}
            onChange={(e) => setOptions((o) => ({ ...o, from: e.target.value as Options["from"] }))}
          >
            <option value="java">{"Java"}</option>
            <option value="strftime">{"strftime"}</option>
            <option value="moment">{"Moment / Day.js"}</option>
            <option value="oracle">{"Oracle TO_CHAR"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showSample} onChange={(e) => setOptions((o) => ({ ...o, showSample: e.target.checked }))} />
          Show rendered sample
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Patterns (one per line)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="yyyy-MM-dd'T'HH:mm:ss.SSSXXX"
                aria-label="Patterns (one per line)"
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
