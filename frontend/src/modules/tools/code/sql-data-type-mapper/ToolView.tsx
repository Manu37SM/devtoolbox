"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { sqlDataTypeMapper } from "./transform";
import type { SqlDataTypeMapperOptions } from "./schema";

type Options = SqlDataTypeMapperOptions;

const defaultOptions: Options = {"from": "auto", "to": "postgresql", "mode": "ddl", "integers": "smart", "numberOneAsBoolean": false, "unicode": false, "jsonb": true, "oracleBoolean": false, "identifiers": "keep", "quoteAll": false, "notesAsComments": true} as Options;

export function SqlDataTypeMapperToolView() {
  const [in0, setIn0] = useState("CREATE TABLE accounts (\n  id          NUMBER(19) NOT NULL,\n  acct_no     VARCHAR2(20 CHAR) NOT NULL,\n  balance     NUMBER(19,2) DEFAULT 0 NOT NULL,\n  opened_on   DATE DEFAULT SYSDATE,\n  is_active   NUMBER(1) DEFAULT 1,\n  notes       CLOB,\n  CONSTRAINT pk_accounts PRIMARY KEY (id),\n  CONSTRAINT uq_acct UNIQUE (acct_no)\n);");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => sqlDataTypeMapper(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"From"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.from} onChange={(e) => setOptions((o) => ({ ...o, from: e.target.value as Options["from"] }))}>
            <option value={"auto"}>{"Auto-detect"}</option>
            <option value={"oracle"}>{"Oracle"}</option>
            <option value={"postgresql"}>{"PostgreSQL"}</option>
            <option value={"mysql"}>{"MySQL / MariaDB"}</option>
            <option value={"sqlserver"}>{"SQL Server"}</option>
            <option value={"sqlite"}>{"SQLite"}</option>
            <option value={"db2"}>{"Db2"}</option>
          </select>
        </label>
        {["ddl"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"To"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.to} onChange={(e) => setOptions((o) => ({ ...o, to: e.target.value as Options["to"] }))}>
            <option value={"oracle"}>{"Oracle"}</option>
            <option value={"postgresql"}>{"PostgreSQL"}</option>
            <option value={"mysql"}>{"MySQL / MariaDB"}</option>
            <option value={"sqlserver"}>{"SQL Server"}</option>
            <option value={"sqlite"}>{"SQLite"}</option>
            <option value={"db2"}>{"Db2"}</option>
          </select>
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Output"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.mode} onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}>
            <option value={"ddl"}>{"Converted CREATE TABLE"}</option>
            <option value={"types"}>{"Types table (all DBs + Java / TS)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Oracle NUMBER(p,0)"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.integers} onChange={(e) => setOptions((o) => ({ ...o, integers: e.target.value as Options["integers"] }))}>
            <option value={"smart"}>{"smallint / int / bigint by precision"}</option>
            <option value={"numeric"}>{"Keep as numeric"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Identifier case"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.identifiers} onChange={(e) => setOptions((o) => ({ ...o, identifiers: e.target.value as Options["identifiers"] }))}>
            <option value={"keep"}>{"Keep"}</option>
            <option value={"lower"}>{"lower"}</option>
            <option value={"upper"}>{"UPPER"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.numberOneAsBoolean} onChange={(e) => setOptions((o) => ({ ...o, numberOneAsBoolean: e.target.checked }))} />
          {"NUMBER(1) \u2192 boolean"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.unicode} onChange={(e) => setOptions((o) => ({ ...o, unicode: e.target.checked }))} />
          {"Prefer Unicode types"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.jsonb} onChange={(e) => setOptions((o) => ({ ...o, jsonb: e.target.checked }))} />
          {"JSON \u2192 jsonb (PostgreSQL)"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.oracleBoolean} onChange={(e) => setOptions((o) => ({ ...o, oracleBoolean: e.target.checked }))} />
          {"Oracle 23ai BOOLEAN"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.quoteAll} onChange={(e) => setOptions((o) => ({ ...o, quoteAll: e.target.checked }))} />
          {"Quote all identifiers"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.notesAsComments} onChange={(e) => setOptions((o) => ({ ...o, notesAsComments: e.target.checked }))} />
          {"Notes as comments"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"CREATE TABLE statements"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"Paste one or more CREATE TABLE statements"}
                  aria-label={"CREATE TABLE statements"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Converted DDL"} fileName={"converted.sql"} value={result.output} error={result.error?.message ?? null} placeholder={"Converted DDL appears here"} />}
        />
      </div>
    </div>
  );
}
