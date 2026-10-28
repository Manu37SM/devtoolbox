"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { inspectUnicode } from "./transform";
import type { UnicodeInspectorOptions } from "./schema";

type Options = UnicodeInspectorOptions;

const defaultOptions: Options = {"mode":"table"} as Options;

export function UnicodeInspectorToolView() {
  const [input, setInput] = useState("Héllo\u200b wörld 😀 — a\u00a0b");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => inspectUnicode(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          View
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.mode}
            onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}
          >
            <option value="table">{"Code point table"}</option>
            <option value="invisible">{"Find invisible characters"}</option>
            <option value="escapes">{"Escape sequences"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Text</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste text to inspect"
                aria-label="Text"
                className=""
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
