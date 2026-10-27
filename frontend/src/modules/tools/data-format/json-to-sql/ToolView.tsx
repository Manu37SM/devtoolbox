"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { convertJsonToSql } from "./transform";
import type { JsonToSqlOptions } from "./schema";

type Options = JsonToSqlOptions;

const defaultOptions: Options = {"dialect":"oracle","tableName":"my_table","includeCreate":true,"multiRow":false} as Options;

export function JsonToSqlToolView() {
  const [input, setInput] = useState("[\n  {\"id\": 1, \"name\": \"Ann\", \"active\": true},\n  {\"id\": 2, \"name\": \"Bob\", \"active\": false}\n]");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertJsonToSql(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Dialect
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.dialect}
            onChange={(e) => setOptions((o) => ({ ...o, dialect: e.target.value as Options["dialect"] }))}
          >
            <option value="oracle">{"Oracle"}</option>
            <option value="postgres">{"PostgreSQL"}</option>
            <option value="mysql">{"MySQL"}</option>
            <option value="sqlite">{"SQLite"}</option>
            <option value="sqlserver">{"SQL Server"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Table
          <input
            type="text"
            value={options.tableName}
            placeholder=""
            onChange={(e) => setOptions((o) => ({ ...o, tableName: e.target.value }))}
            className="w-36 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.includeCreate} onChange={(e) => setOptions((o) => ({ ...o, includeCreate: e.target.checked }))} />
          CREATE TABLE
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.multiRow} onChange={(e) => setOptions((o) => ({ ...o, multiRow: e.target.checked }))} />
          Batch rows (INSERT ALL / multi-row)
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="A JSON object or array of objects"
                aria-label="Input"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane label="SQL" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
