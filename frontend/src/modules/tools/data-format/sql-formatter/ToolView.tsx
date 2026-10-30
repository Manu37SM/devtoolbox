"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { formatSql } from "./transform";
import { SQL_DIALECT_IDS, SQL_DIALECT_LABELS, type SqlFormatterOptions } from "./schema";

const defaultOptions: SqlFormatterOptions = {
  dialect: "sql",
  keywordCase: "upper",
  tabWidth: 2,
  useTabs: false,
  functionCase: "preserve",
  dataTypeCase: "preserve",
  indentStyle: "standard",
  logicalOperatorNewline: "before",
  expressionWidth: 50,
  linesBetweenQueries: 1,
  denseOperators: false,
  newlineBeforeSemicolon: false,
};

export function SqlFormatterToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<SqlFormatterOptions>(defaultOptions);

  const result = useMemo(() => formatSql(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Dialect
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.dialect}
            onChange={(e) =>
              setOptions((o) => ({
                ...o,
                dialect: e.target.value as SqlFormatterOptions["dialect"],
              }))
            }
          >
            {SQL_DIALECT_IDS.map((id) => (
              <option key={id} value={id}>
                {SQL_DIALECT_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Keyword case
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.keywordCase}
            onChange={(e) =>
              setOptions((o) => ({
                ...o,
                keywordCase: e.target.value as SqlFormatterOptions["keywordCase"],
              }))
            }
          >
            <option value="preserve">Preserve</option>
            <option value="upper">UPPER</option>
            <option value="lower">lower</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Tab width
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={String(options.tabWidth)}
            onChange={(e) => setOptions((o) => ({ ...o, tabWidth: Number(e.target.value) }))}
          >
            <option value="2">2 spaces</option>
            <option value="4">4 spaces</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.useTabs}
            onChange={(e) => setOptions((o) => ({ ...o, useTabs: e.target.checked }))}
          />
          Tabs
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Functions
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.functionCase}
            onChange={(e) => setOptions((o) => ({ ...o, functionCase: e.target.value as SqlFormatterOptions["functionCase"] }))}
          >
            <option value="preserve">Preserve</option>
            <option value="upper">UPPER</option>
            <option value="lower">lower</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Data types
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.dataTypeCase}
            onChange={(e) => setOptions((o) => ({ ...o, dataTypeCase: e.target.value as SqlFormatterOptions["dataTypeCase"] }))}
          >
            <option value="preserve">Preserve</option>
            <option value="upper">UPPER</option>
            <option value="lower">lower</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Layout
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.indentStyle}
            onChange={(e) => setOptions((o) => ({ ...o, indentStyle: e.target.value as SqlFormatterOptions["indentStyle"] }))}
          >
            <option value="standard">Standard</option>
            <option value="tabularLeft">Aligned (left)</option>
            <option value="tabularRight">Aligned (right)</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          AND / OR
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.logicalOperatorNewline}
            onChange={(e) => setOptions((o) => ({ ...o, logicalOperatorNewline: e.target.value as SqlFormatterOptions["logicalOperatorNewline"] }))}
          >
            <option value="before">Start of line</option>
            <option value="after">End of line</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Inline up to
          <input
            type="number"
            min={10}
            max={200}
            value={options.expressionWidth}
            onChange={(e) => setOptions((o) => ({ ...o, expressionWidth: Math.min(200, Math.max(10, Number(e.target.value) || 0)) }))}
            className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Blank lines
          <input
            type="number"
            min={0}
            max={5}
            value={options.linesBetweenQueries}
            onChange={(e) => setOptions((o) => ({ ...o, linesBetweenQueries: Math.min(5, Math.max(0, Number(e.target.value) || 0)) }))}
            className="w-14 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.denseOperators}
            onChange={(e) => setOptions((o) => ({ ...o, denseOperators: e.target.checked }))}
          />
          Dense operators
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.newlineBeforeSemicolon}
            onChange={(e) => setOptions((o) => ({ ...o, newlineBeforeSemicolon: e.target.checked }))}
          />
          ; on own line
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="SELECT id, name FROM users WHERE id = 1;"
                aria-label="SQL input"
              />
            </div>
          }
          output={
            <OutputPane
              value={result.output}
              error={result.error?.message ?? null}
              placeholder="Formatted SQL will appear here"
            />
          }
        />
      </div>
    </div>
  );
}
