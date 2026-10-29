"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runLinkHeader } from "./transform";
import type { LinkHeaderParserOptions } from "./schema";

type Options = LinkHeaderParserOptions;

const defaultOptions: Options = {"format":"table"} as Options;

export function LinkHeaderParserToolView() {
  const [input, setInput] = useState("<https://api.github.com/repos?page=2>; rel=\"next\", <https://api.github.com/repos?page=34>; rel=\"last\", </static/app.css>; rel=preload");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runLinkHeader(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.format}
            onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}
          >
            <option value="table">{"Readable"}</option>
            <option value="json">{"JSON"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Link header value</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"<https://api.example.com/items?page=2>; rel=\"next\""}
                aria-label="Link header value"
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
