"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runSqlInClauseBuilder } from "./transform";
import type { SqlInClauseBuilderOptions } from "./schema";

type Options = SqlInClauseBuilderOptions;

const defaultOptions: Options = {"format":"or-chunks","quoting":"auto","chunkSize":1000,"column":"id","dedupe":true} as Options;

export function SqlInClauseBuilderToolView() {
  const [input, setInput] = useState("C-1001\nC-1002\nO'Neil\nC-1001\nC-2040");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runSqlInClauseBuilder(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Format
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.format}
            onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}
          >
            <option value="or-chunks">{"IN ... OR IN (chunked)"}</option>
            <option value="in">{"Separate IN lists"}</option>
            <option value="values">{"VALUES rows"}</option>
            <option value="union-all">{"UNION ALL"}</option>
            <option value="insert">{"INSERT into temp table"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Values
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.quoting}
            onChange={(e) => setOptions((o) => ({ ...o, quoting: e.target.value as Options["quoting"] }))}
          >
            <option value="auto">{"Auto"}</option>
            <option value="string">{"Strings"}</option>
            <option value="number">{"Numbers"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Chunk size
          <input
            type="number"
            min={1} max={100000}
            value={options.chunkSize}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, chunkSize: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Column
          <input
            type="text"
            value={options.column}
            onChange={(e) => setOptions((o) => ({ ...o, column: e.target.value }))}
            placeholder="customer_id"
            aria-label="Column"
            className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.dedupe} onChange={(e) => setOptions((o) => ({ ...o, dedupe: e.target.checked }))} />
          Remove duplicates
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Values (one per line or comma separated)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"1001\n1002"}
                aria-label="Values (one per line or comma separated)"
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
