"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { lookupMime } from "./transform";
import type { MimeTypesOptions } from "./schema";

type Options = MimeTypesOptions;

const defaultOptions: Options = {"format":"ext-first"} as Options;

export function MimeTypesToolView() {
  const [input, setInput] = useState("json");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => lookupMime(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Layout
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.format}
            onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}
          >
            <option value="ext-first">{"Extension first"}</option>
            <option value="mime-first">{"MIME first"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Extension or MIME type</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="json, .pdf, image/, spreadsheet…"
                aria-label="Extension or MIME type"
                
              />
            </div>
          }
          output={<OutputPane label="Matches" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
