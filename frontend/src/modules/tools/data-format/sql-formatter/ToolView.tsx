"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { formatSql } from "./transform";
import type { SqlFormatterOptions } from "./schema";

const defaultOptions: SqlFormatterOptions = {
  dialect: "sql",
  keywordCase: "upper",
  tabWidth: 2,
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
            <option value="sql">Standard SQL</option>
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="sqlite">SQLite</option>
            <option value="mariadb">MariaDB</option>
            <option value="bigquery">BigQuery</option>
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
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea
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
