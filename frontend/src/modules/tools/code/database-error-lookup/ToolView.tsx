"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runDatabaseErrorLookup } from "./transform";
import type { DatabaseErrorLookupOptions } from "./schema";

type Options = DatabaseErrorLookupOptions;

const defaultOptions: Options = {"database":"auto"} as Options;

export function DatabaseErrorLookupToolView() {
  const [input, setInput] = useState("org.springframework.dao.DuplicateKeyException: PreparedStatementCallback;\nCaused by: java.sql.SQLIntegrityConstraintViolationException: ORA-00001: unique constraint (APP.UK_CUSTOMER_EMAIL) violated\nORA-06512: at \"APP.PKG_CUSTOMER\", line 42");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runDatabaseErrorLookup(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Database
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.database}
            onChange={(e) => setOptions((o) => ({ ...o, database: e.target.value as Options["database"] }))}
          >
            <option value="auto">{"Detect"}</option>
            <option value="oracle">{"Oracle"}</option>
            <option value="postgresql">{"PostgreSQL"}</option>
            <option value="mysql">{"MySQL"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Error message, stack trace or codes</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ORA-00001"
                aria-label="Error message, stack trace or codes"
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
