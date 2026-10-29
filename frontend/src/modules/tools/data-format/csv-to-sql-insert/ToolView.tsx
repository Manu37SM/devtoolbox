"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { csvToInsert } from "./transform";
import type { CsvToSqlInsertOptions } from "./schema";

type Options = CsvToSqlInsertOptions;

const defaultOptions: Options = {"dialect":"postgres","delimiter":",","inferTypes":true,"emptyAsNull":true,"batchSize":100} as Options;

export function CsvToSqlInsertToolView() {
  const [input, setInput] = useState("table: app.users\nid,name,score,active\n1,Ann,9.5,true\n2,O'Brien,,false");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => csvToInsert(input, options), [input, options]);

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
            <option value="postgres">{"PostgreSQL"}</option>
            <option value="mysql">{"MySQL"}</option>
            <option value="oracle">{"Oracle"}</option>
            <option value="sqlite">{"SQLite"}</option>
            <option value="sqlserver">{"SQL Server"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Delimiter
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.delimiter}
            onChange={(e) => setOptions((o) => ({ ...o, delimiter: e.target.value as Options["delimiter"] }))}
          >
            <option value=",">{"Comma"}</option>
            <option value=";">{"Semicolon"}</option>
            <option value="tab">{"Tab"}</option>
            <option value="|">{"Pipe"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.inferTypes} onChange={(e) => setOptions((o) => ({ ...o, inferTypes: e.target.checked }))} />
          Detect numbers and booleans
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.emptyAsNull} onChange={(e) => setOptions((o) => ({ ...o, emptyAsNull: e.target.checked }))} />
          Empty = NULL
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Rows per INSERT
          <input
            type="number"
            min={1} max={1000}
            value={options.batchSize}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, batchSize: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">CSV (optional first line: table: schema.name)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"table: users\nid,name\n1,Ann"}
                aria-label="CSV (optional first line: table: schema.name)"
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
