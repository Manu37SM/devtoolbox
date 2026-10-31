"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { csvPivot } from "./transform";
import type { CsvPivotOptions } from "./schema";

type Options = CsvPivotOptions;

const defaultOptions: Options = {"delimiter": "auto", "hasHeader": true, "groupBy": "", "aggregates": "count()", "pivotColumn": "", "fill": "", "sortBy": "group", "totals": false, "stripThousands": true, "skipNonNumeric": true, "caseInsensitive": false, "trim": true, "decimals": 4, "output": "csv"} as Options;

export function CsvPivotToolView() {
  const [in0, setIn0] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => csvPivot(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Group by"}
          <input type="text" value={options.groupBy} placeholder={"region, product"} onChange={(e) => setOptions((o) => ({ ...o, groupBy: e.target.value }))} className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Aggregates"}
          <input type="text" value={options.aggregates} placeholder={"count(), sum(amount), avg(price) as mean"} onChange={(e) => setOptions((o) => ({ ...o, aggregates: e.target.value }))} className="w-80 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Pivot column"}
          <input type="text" value={options.pivotColumn} placeholder={"product"} onChange={(e) => setOptions((o) => ({ ...o, pivotColumn: e.target.value }))} className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Empty cell"}
          <input type="text" value={options.fill} placeholder={"0"} onChange={(e) => setOptions((o) => ({ ...o, fill: e.target.value }))} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Sort"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.sortBy} onChange={(e) => setOptions((o) => ({ ...o, sortBy: e.target.value as Options["sortBy"] }))}>
            <option value={"group"}>{"By group"}</option>
            <option value={"group-desc"}>{"By group (desc)"}</option>
            <option value={"first-aggregate"}>{"By first aggregate"}</option>
            <option value={"first-aggregate-desc"}>{"By first aggregate (desc)"}</option>
            <option value={"none"}>{"As found"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Delimiter"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.delimiter} onChange={(e) => setOptions((o) => ({ ...o, delimiter: e.target.value as Options["delimiter"] }))}>
            <option value={"auto"}>{"Auto"}</option>
            <option value={","}>{"Comma"}</option>
            <option value={"\t"}>{"Tab"}</option>
            <option value={";"}>{"Semicolon"}</option>
            <option value={"|"}>{"Pipe"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Output"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.output} onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}>
            <option value={"csv"}>{"CSV"}</option>
            <option value={"tsv"}>{"TSV"}</option>
            <option value={"json"}>{"JSON"}</option>
            <option value={"markdown"}>{"Markdown"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Decimals"}
          <input type="number" min={0} max={10} value={options.decimals} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, decimals: Math.min(10, Math.max(0, n)) })); }} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.hasHeader} onChange={(e) => setOptions((o) => ({ ...o, hasHeader: e.target.checked }))} />
          {"Header row"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.totals} onChange={(e) => setOptions((o) => ({ ...o, totals: e.target.checked }))} />
          {"Totals"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.stripThousands} onChange={(e) => setOptions((o) => ({ ...o, stripThousands: e.target.checked }))} />
          {"Strip 1,000s"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.skipNonNumeric} onChange={(e) => setOptions((o) => ({ ...o, skipNonNumeric: e.target.checked }))} />
          {"Skip non-numeric"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.caseInsensitive} onChange={(e) => setOptions((o) => ({ ...o, caseInsensitive: e.target.checked }))} />
          {"Ignore case"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.trim} onChange={(e) => setOptions((o) => ({ ...o, trim: e.target.checked }))} />
          {"Trim"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"CSV"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"region,product,amount\nEast,A,100\n\u2026"}
                  aria-label={"CSV"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Result"} fileName={"pivot.csv"} value={result.output} error={result.error?.message ?? null} placeholder={"Enter columns to group by and aggregates"} />}
        />
      </div>
    </div>
  );
}
