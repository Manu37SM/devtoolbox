"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { compareCsv } from "./transform";
import type { CsvDiffOptions } from "./schema";

type Options = CsvDiffOptions;

const defaultOptions: Options = {"delimiter": "auto", "hasHeader": true, "keyColumns": "", "ignoreColumns": "", "ignoreCase": false, "trimWhitespace": true, "numericTolerance": 0, "output": "summary", "includeUnchanged": false} as Options;

export function CsvDiffToolView() {
  const [in0, setIn0] = useState("id,name,age\n1,Ann,30\n2,Bob,31\n3,Cy,40");
  const [in1, setIn1] = useState("id,name,age\n1,Ann,30\n2,Rob,32\n4,Di,22");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => compareCsv(in0, in1, options), [in0, in1, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
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
          <input type="checkbox" checked={options.hasHeader} onChange={(e) => setOptions((o) => ({ ...o, hasHeader: e.target.checked }))} />
          {"Header row"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Key columns"}
          <input type="text" value={options.keyColumns} placeholder={"id or 1"} onChange={(e) => setOptions((o) => ({ ...o, keyColumns: e.target.value }))} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Ignore columns"}
          <input type="text" value={options.ignoreColumns} placeholder={"updated_at"} onChange={(e) => setOptions((o) => ({ ...o, ignoreColumns: e.target.value }))} className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.ignoreCase} onChange={(e) => setOptions((o) => ({ ...o, ignoreCase: e.target.checked }))} />
          {"Ignore case"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.trimWhitespace} onChange={(e) => setOptions((o) => ({ ...o, trimWhitespace: e.target.checked }))} />
          {"Trim spaces"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Number tolerance"}
          <input type="number" min={0} max={1000000} step={"any"} value={options.numericTolerance} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, numericTolerance: Math.min(1000000, Math.max(0, n)) })); }} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Output"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.output} onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}>
            <option value={"summary"}>{"Change list"}</option>
            <option value={"csv"}>{"CSV with _diff column"}</option>
            <option value={"json"}>{"JSON"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.includeUnchanged} onChange={(e) => setOptions((o) => ({ ...o, includeUnchanged: e.target.checked }))} />
          {"CSV: include unchanged"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Before"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"id,name\n1,Ann"}
                  aria-label={"Before"}
                  className="font-mono"
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"After"}</label>
                <ToolInput
                  value={in1}
                  onChange={(e) => setIn1(e.target.value)}
                  placeholder={"id,name\n1,Ann"}
                  aria-label={"After"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Differences"} value={result.output} error={result.error?.message ?? null} placeholder={"Differences will appear here"} />}
        />
      </div>
    </div>
  );
}
