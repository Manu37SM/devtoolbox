"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runTemplateBulkGenerator } from "./transform";
import type { TemplateBulkGeneratorOptions } from "./schema";

type Options = TemplateBulkGeneratorOptions;

const defaultOptions: Options = {"separator":"newline","missing":"error"} as Options;

export function TemplateBulkGeneratorToolView() {
  const [input, setInput] = useState("INSERT INTO customers (id, name, email, city) VALUES ({{id|sqlnum}}, {{name|sql}}, {{email|lower|sql}}, {{city|default:Pune|sql}});");
  const [input2, setInput2] = useState("id,name,email,city\n1,Asha Rao,ASHA@EXAMPLE.COM,Mumbai\n2,\"O'Brien, Sean\",sean@example.com,\n3,Li Wei,li@example.com,Bengaluru");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runTemplateBulkGenerator(input, input2, options), [input, input2, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Join with
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.separator}
            onChange={(e) => setOptions((o) => ({ ...o, separator: e.target.value as Options["separator"] }))}
          >
            <option value="newline">{"New line"}</option>
            <option value="blank-line">{"Blank line"}</option>
            <option value="comma">{"Comma + new line"}</option>
            <option value="none">{"Nothing"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Missing column
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.missing}
            onChange={(e) => setOptions((o) => ({ ...o, missing: e.target.value as Options["missing"] }))}
          >
            <option value="error">{"Error"}</option>
            <option value="empty">{"Empty"}</option>
            <option value="keep">{"Keep {{name}}"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Template</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="INSERT INTO t VALUES ({{id}}, {{name|sql}});"
                aria-label="Template"
                className="font-mono h-auto min-h-[120px] flex-1"
              />
              <label className="text-sm font-medium text-text-secondary">Data (CSV, TSV or JSON; first row = column names)</label>
              <ToolInput
                value={input2}
                onChange={(e) => setInput2(e.target.value)}
                placeholder={"id,name\n1,Ann"}
                aria-label="Data (CSV, TSV or JSON; first row = column names)"
                className="h-auto min-h-[120px] flex-1 font-mono"
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
