"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { businessDaysCalculator } from "./transform";
import type { BusinessDaysCalculatorOptions } from "./schema";

type Options = BusinessDaysCalculatorOptions;

const defaultOptions: Options = {"mode": "add", "days": 5, "weekend": "sat-sun", "inclusiveEnd": true, "showSkipped": true} as Options;

export function BusinessDaysCalculatorToolView() {
  const [in0, setIn0] = useState("2026-10-30\nholiday 2026-11-02");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => businessDaysCalculator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Mode"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.mode} onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}>
            <option value={"add"}>{"Add / subtract days"}</option>
            <option value={"count"}>{"Count between dates"}</option>
            <option value={"list"}>{"List business days"}</option>
            <option value={"info"}>{"Is it a business day?"}</option>
          </select>
        </label>
        {["add"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Business days (negative = back)"}
          <input type="number" min={-100000} max={100000} step={1} value={options.days} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, days: Math.min(100000, Math.max(-100000, n)) })); }} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Weekend"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.weekend} onChange={(e) => setOptions((o) => ({ ...o, weekend: e.target.value as Options["weekend"] }))}>
            <option value={"sat-sun"}>{"Sat + Sun"}</option>
            <option value={"fri-sat"}>{"Fri + Sat"}</option>
            <option value={"thu-fri"}>{"Thu + Fri"}</option>
            <option value={"fri"}>{"Fri only"}</option>
            <option value={"sat"}>{"Sat only"}</option>
            <option value={"sun"}>{"Sun only"}</option>
            <option value={"none"}>{"No weekend"}</option>
          </select>
        </label>
        {["count"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.inclusiveEnd} onChange={(e) => setOptions((o) => ({ ...o, inclusiveEnd: e.target.checked }))} />
          {"Include end date"}
        </label>
        )}
        {["add", "count"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showSkipped} onChange={(e) => setOptions((o) => ({ ...o, showSkipped: e.target.checked }))} />
          {"List skipped days"}
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Dates (YYYY-MM-DD, one per line) + optional holiday lines"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"2026-10-30\nholiday 2026-11-01\nholiday 2026-12-24..2026-12-26"}
                  aria-label={"Dates (YYYY-MM-DD, one per line) + optional holiday lines"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Result"} fileName={"business-days.txt"} value={result.output} error={result.error?.message ?? null} placeholder={"Enter a start date"} />}
        />
      </div>
    </div>
  );
}
