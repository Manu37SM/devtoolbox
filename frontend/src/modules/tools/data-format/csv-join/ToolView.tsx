"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { joinCsv } from "./transform";
import type { CsvJoinOptions } from "./schema";

type Options = CsvJoinOptions;

const defaultOptions: Options = {"delimiter": "auto", "hasHeader": true, "leftKey": "id", "rightKey": "", "joinType": "left", "ignoreCase": false, "trimKeys": true, "suffix": "_right", "dropRightKeys": true, "columns": "", "output": "csv"} as Options;

export function CsvJoinToolView() {
  const [in0, setIn0] = useState("id,name\n1,Ann\n2,Bob\n3,Cy");
  const [in1, setIn1] = useState("id,city\n2,Pune\n3,Goa\n3,Delhi\n4,Kochi");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => joinCsv(in0, in1, options), [in0, in1, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Join"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.joinType} onChange={(e) => setOptions((o) => ({ ...o, joinType: e.target.value as Options["joinType"] }))}>
            <option value={"inner"}>{"Inner"}</option>
            <option value={"left"}>{"Left"}</option>
            <option value={"right"}>{"Right"}</option>
            <option value={"full"}>{"Full outer"}</option>
            <option value={"left-anti"}>{"Left anti (no match)"}</option>
            <option value={"right-anti"}>{"Right anti (no match)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Left key"}
          <input type="text" value={options.leftKey} placeholder={"id or 1"} onChange={(e) => setOptions((o) => ({ ...o, leftKey: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Right key"}
          <input type="text" value={options.rightKey} placeholder={"same"} onChange={(e) => setOptions((o) => ({ ...o, rightKey: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.ignoreCase} onChange={(e) => setOptions((o) => ({ ...o, ignoreCase: e.target.checked }))} />
          {"Ignore case"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.trimKeys} onChange={(e) => setOptions((o) => ({ ...o, trimKeys: e.target.checked }))} />
          {"Trim keys"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Suffix"}
          <input type="text" value={options.suffix} placeholder={"_right"} onChange={(e) => setOptions((o) => ({ ...o, suffix: e.target.value }))} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.dropRightKeys} onChange={(e) => setOptions((o) => ({ ...o, dropRightKeys: e.target.checked }))} />
          {"Drop right keys"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Columns"}
          <input type="text" value={options.columns} placeholder={"all"} onChange={(e) => setOptions((o) => ({ ...o, columns: e.target.value }))} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
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
          <input type="checkbox" checked={options.hasHeader} onChange={(e) => setOptions((o) => ({ ...o, hasHeader: e.target.checked }))} />
          {"Header row"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Output"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.output} onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}>
            <option value={"csv"}>{"CSV"}</option>
            <option value={"json"}>{"JSON"}</option>
            <option value={"markdown"}>{"Markdown table"}</option>
            <option value={"stats"}>{"Match statistics"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Left CSV"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"id,name\n1,Ann"}
                  aria-label={"Left CSV"}
                  className="font-mono"
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Right CSV"}</label>
                <ToolInput
                  value={in1}
                  onChange={(e) => setIn1(e.target.value)}
                  placeholder={"id,city\n2,Pune"}
                  aria-label={"Right CSV"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Joined"} value={result.output} error={result.error?.message ?? null} placeholder={"Joined rows will appear here"} />}
        />
      </div>
    </div>
  );
}
