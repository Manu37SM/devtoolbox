"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { convertSqlInserts } from "./transform";
import type { SqlInsertParserOptions } from "./schema";

type Options = SqlInsertParserOptions;

const defaultOptions: Options = {"output": "csv", "table": "", "nullAs": "empty", "backslashEscapes": false, "typedJson": true, "includeTableColumn": false} as Options;

export function SqlInsertParserToolView() {
  const [in0, setIn0] = useState("INSERT INTO users (id, name, email, active) VALUES\n  (1, Ann, ann@example.com, TRUE),\n  (2, OBrien, NULL, FALSE);");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertSqlInserts(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Output"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.output} onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}>
            <option value={"csv"}>{"CSV"}</option>
            <option value={"tsv"}>{"TSV"}</option>
            <option value={"json"}>{"JSON"}</option>
            <option value={"markdown"}>{"Markdown table"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Table"}
          <input type="text" value={options.table} placeholder={"all"} onChange={(e) => setOptions((o) => ({ ...o, table: e.target.value }))} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"NULL as"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.nullAs} onChange={(e) => setOptions((o) => ({ ...o, nullAs: e.target.value as Options["nullAs"] }))}>
            <option value={"empty"}>{"(empty)"}</option>
            <option value={"NULL"}>{"NULL"}</option>
            <option value={"null"}>{"null"}</option>
            <option value={"\\N"}>{"\\N"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.backslashEscapes} onChange={(e) => setOptions((o) => ({ ...o, backslashEscapes: e.target.checked }))} />
          {"Backslash escapes (MySQL)"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.typedJson} onChange={(e) => setOptions((o) => ({ ...o, typedJson: e.target.checked }))} />
          {"Typed JSON"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.includeTableColumn} onChange={(e) => setOptions((o) => ({ ...o, includeTableColumn: e.target.checked }))} />
          {"Table column"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"SQL INSERT statements"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"INSERT INTO users (id, name) VALUES (1, Ann);"}
                  aria-label={"SQL INSERT statements"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Rows"} value={result.output} error={result.error?.message ?? null} placeholder={"Rows will appear here"} />}
        />
      </div>
    </div>
  );
}
