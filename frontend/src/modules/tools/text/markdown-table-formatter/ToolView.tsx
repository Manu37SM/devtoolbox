"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runMarkdownTable } from "./transform";
import type { MarkdownTableFormatterOptions } from "./schema";

type Options = MarkdownTableFormatterOptions;

const defaultOptions: Options = {"source":"markdown","align":"keep","compact":false} as Options;

export function MarkdownTableFormatterToolView() {
  const [input, setInput] = useState("|Name|Qty|Note|\n|:--|--:|:-:|\n|apple|10|ok|\n|kiwi|2|a longer note|");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runMarkdownTable(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Input
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.source}
            onChange={(e) => setOptions((o) => ({ ...o, source: e.target.value as Options["source"] }))}
          >
            <option value="markdown">{"Markdown table"}</option>
            <option value="csv">{"CSV"}</option>
            <option value="tsv">{"TSV"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Alignment
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.align}
            onChange={(e) => setOptions((o) => ({ ...o, align: e.target.value as Options["align"] }))}
          >
            <option value="keep">{"Keep"}</option>
            <option value="left">{"Left"}</option>
            <option value="center">{"Center"}</option>
            <option value="right">{"Right"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.compact} onChange={(e) => setOptions((o) => ({ ...o, compact: e.target.checked }))} />
          Compact (no padding)
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Table or CSV</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"|Name|Qty|\n|:--|--:|\n|apple|10|"}
                aria-label="Table or CSV"
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
