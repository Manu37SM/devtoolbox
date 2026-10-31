"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { isoCodeLookup } from "./transform";
import type { IsoCodeLookupOptions } from "./schema";

type Options = IsoCodeLookupOptions;

const defaultOptions: Options = {"type": "all", "match": "smart", "output": "table", "limit": 25, "listAllWhenEmpty": true, "includeOfficialName": false, "codeForm": "alpha2"} as Options;

export function IsoCodeLookupToolView() {
  const [in0, setIn0] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => isoCodeLookup(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"List"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.type} onChange={(e) => setOptions((o) => ({ ...o, type: e.target.value as Options["type"] }))}>
            <option value={"all"}>{"All"}</option>
            <option value={"country"}>{"Countries (3166)"}</option>
            <option value={"currency"}>{"Currencies (4217)"}</option>
            <option value={"language"}>{"Languages (639-1)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Match"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.match} onChange={(e) => setOptions((o) => ({ ...o, match: e.target.value as Options["match"] }))}>
            <option value={"smart"}>{"Smart"}</option>
            <option value={"exact"}>{"Exact"}</option>
            <option value={"starts"}>{"Starts with"}</option>
            <option value={"contains"}>{"Contains"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Output"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.output} onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}>
            <option value={"table"}>{"Table"}</option>
            <option value={"csv"}>{"CSV"}</option>
            <option value={"json"}>{"JSON"}</option>
            <option value={"codes"}>{"Codes only"}</option>
          </select>
        </label>
        {["codes"].includes(String(options.output)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Code"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.codeForm} onChange={(e) => setOptions((o) => ({ ...o, codeForm: e.target.value as Options["codeForm"] }))}>
            <option value={"alpha2"}>{"Alpha-2"}</option>
            <option value={"alpha3"}>{"Alpha-3"}</option>
            <option value={"numeric"}>{"Numeric"}</option>
          </select>
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Hits per query"}
          <input type="number" min={1} max={500} value={options.limit} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, limit: Math.min(500, Math.max(1, n)) })); }} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.includeOfficialName} onChange={(e) => setOptions((o) => ({ ...o, includeOfficialName: e.target.checked }))} />
          {"Official name"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.listAllWhenEmpty} onChange={(e) => setOptions((o) => ({ ...o, listAllWhenEmpty: e.target.checked }))} />
          {"List all when empty"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Codes or names (one per line or comma separated)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"IN\nJPY\nswahili\n392"}
                  aria-label={"Codes or names (one per line or comma separated)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Matches"} fileName={"iso-codes.txt"} value={result.output} error={result.error?.message ?? null} placeholder={"Type a code or name, or choose a list and leave this empty"} />}
        />
      </div>
    </div>
  );
}
