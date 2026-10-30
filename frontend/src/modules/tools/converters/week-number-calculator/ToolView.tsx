"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { calculateWeeks } from "./transform";
import type { WeekNumberCalculatorOptions } from "./schema";

type Options = WeekNumberCalculatorOptions;

const defaultOptions: Options = {"system": "iso", "firstWeekday": 1, "minDays": 4, "mode": "dates", "format": "text"} as Options;

export function WeekNumberCalculatorToolView() {
  const [in0, setIn0] = useState("2026-10-30\n2021-01-01\n2026-W44-5");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => calculateWeeks(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Mode"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.mode} onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}>
            <option value={"dates"}>{"Dates / ISO weeks"}</option>
            <option value={"weeks"}>{"All weeks of a year"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Week numbering"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.system} onChange={(e) => setOptions((o) => ({ ...o, system: e.target.value as Options["system"] }))}>
            <option value={"iso"}>{"ISO 8601 (Mon, week 1 has Jan 4)"}</option>
            <option value={"us"}>{"US (Sun, week 1 has Jan 1)"}</option>
            <option value={"unix-sunday"}>{"strftime %U (Sunday, week 0)"}</option>
            <option value={"unix-monday"}>{"strftime %W (Monday, week 0)"}</option>
            <option value={"custom"}>{"Custom"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"First day"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.firstWeekday} onChange={(e) => setOptions((o) => ({ ...o, firstWeekday: Number(e.target.value) }))}>
            <option value={"0"}>{"Sunday"}</option>
            <option value={"1"}>{"Monday"}</option>
            <option value={"2"}>{"Tuesday"}</option>
            <option value={"3"}>{"Wednesday"}</option>
            <option value={"4"}>{"Thursday"}</option>
            <option value={"5"}>{"Friday"}</option>
            <option value={"6"}>{"Saturday"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Min days in week 1"}
          <input type="number" min={1} max={7} value={options.minDays} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, minDays: Math.min(7, Math.max(1, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Format"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.format} onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}>
            <option value={"text"}>{"Text"}</option>
            <option value={"csv"}>{"CSV"}</option>
            <option value={"json"}>{"JSON"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Dates, ISO weeks (2026-W44) or years"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"2026-10-30\n2026-W44\n2026"}
                  aria-label={"Dates, ISO weeks (2026-W44) or years"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Week numbers"} value={result.output} error={result.error?.message ?? null} placeholder={"Week numbers will appear here"} />}
        />
      </div>
    </div>
  );
}
