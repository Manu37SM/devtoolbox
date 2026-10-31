"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { sqlPaginationGenerator } from "./transform";
import type { SqlPaginationGeneratorOptions } from "./schema";

type Options = SqlPaginationGeneratorOptions;

const defaultOptions: Options = {"dialect": "postgresql", "mode": "page", "page": 1, "pageSize": 20, "offset": 0, "limit": 20, "keyColumns": "", "after": "", "params": "literal", "orderBy": "", "lookahead": false, "countQuery": false} as Options;

export function SqlPaginationGeneratorToolView() {
  const [in0, setIn0] = useState("SELECT id, title, created_at\nFROM posts\nWHERE status = 'published'\nORDER BY created_at DESC, id DESC");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => sqlPaginationGenerator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Database"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.dialect} onChange={(e) => setOptions((o) => ({ ...o, dialect: e.target.value as Options["dialect"] }))}>
            <option value={"postgresql"}>{"PostgreSQL"}</option>
            <option value={"mysql"}>{"MySQL / MariaDB"}</option>
            <option value={"sqlite"}>{"SQLite"}</option>
            <option value={"oracle"}>{"Oracle 12c+"}</option>
            <option value={"oracle11"}>{"Oracle 11g (ROWNUM)"}</option>
            <option value={"sqlserver"}>{"SQL Server"}</option>
            <option value={"db2"}>{"Db2"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Method"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.mode} onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}>
            <option value={"page"}>{"Page number"}</option>
            <option value={"offset"}>{"Offset + limit"}</option>
            <option value={"keyset"}>{"Keyset (seek)"}</option>
          </select>
        </label>
        {["page"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Page"}
          <input type="number" min={1} max={1000000} value={options.page} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, page: Math.min(1000000, Math.max(1, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        {["page", "keyset"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Page size"}
          <input type="number" min={1} max={100000} value={options.pageSize} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, pageSize: Math.min(100000, Math.max(1, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        {["offset"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Offset"}
          <input type="number" min={0} max={100000000} value={options.offset} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, offset: Math.min(100000000, Math.max(0, n)) })); }} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        {["offset"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Limit"}
          <input type="number" min={1} max={100000} value={options.limit} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, limit: Math.min(100000, Math.max(1, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        {["keyset"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Key columns (blank = ORDER BY)"}
          <input type="text" value={options.keyColumns} placeholder={"created_at DESC, id DESC"} onChange={(e) => setOptions((o) => ({ ...o, keyColumns: e.target.value }))} className="w-52 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["keyset"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"After values (last row)"}
          <input type="text" value={options.after} placeholder={"'2024-01-05', 42"} onChange={(e) => setOptions((o) => ({ ...o, after: e.target.value }))} className="w-44 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Values as"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.params} onChange={(e) => setOptions((o) => ({ ...o, params: e.target.value as Options["params"] }))}>
            <option value={"literal"}>{"Literals"}</option>
            <option value={"question"}>{"? positional"}</option>
            <option value={"named"}>{":named"}</option>
            <option value={"dollar"}>{"$1 numbered"}</option>
            <option value={"at"}>{"@named"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"ORDER BY if missing"}
          <input type="text" value={options.orderBy} placeholder={"id"} onChange={(e) => setOptions((o) => ({ ...o, orderBy: e.target.value }))} className="w-36 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.lookahead} onChange={(e) => setOptions((o) => ({ ...o, lookahead: e.target.checked }))} />
          {"Fetch one extra row"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.countQuery} onChange={(e) => setOptions((o) => ({ ...o, countQuery: e.target.checked }))} />
          {"Include count query"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Base SELECT"}</label>
                <ToolInput
                  as="code"
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                 
                  placeholder={"Paste a SELECT without LIMIT / OFFSET"}
                  aria-label={"Base SELECT"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Paged SQL"} fileName={"paged.sql"} value={result.output} error={result.error?.message ?? null} placeholder={"Paging SQL appears here"} />}
        />
      </div>
    </div>
  );
}
