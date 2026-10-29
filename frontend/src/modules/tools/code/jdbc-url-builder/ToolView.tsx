"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runJdbc } from "./transform";
import type { JdbcUrlBuilderOptions } from "./schema";

type Options = JdbcUrlBuilderOptions;

const defaultOptions: Options = {"database":"oracle","showSpring":true} as Options;

export function JdbcUrlBuilderToolView() {
  const [input, setInput] = useState("host: db.internal\nport: 1521\ndatabase: ORCLPDB1\nparam: oracle.net.CONNECT_TIMEOUT=5000");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runJdbc(input, options), [input, options]);

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
            <option value="oracle">{"Oracle"}</option>
            <option value="postgresql">{"PostgreSQL"}</option>
            <option value="mysql">{"MySQL"}</option>
            <option value="mariadb">{"MariaDB"}</option>
            <option value="sqlserver">{"SQL Server"}</option>
            <option value="db2">{"Db2"}</option>
            <option value="h2">{"H2"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showSpring} onChange={(e) => setOptions((o) => ({ ...o, showSpring: e.target.checked }))} />
          Show Spring properties
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Fields (host, port, database, sid, param) or a jdbc: URL to parse</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="host: db.internal"
                aria-label="Fields (host, port, database, sid, param) or a jdbc: URL to parse"
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
