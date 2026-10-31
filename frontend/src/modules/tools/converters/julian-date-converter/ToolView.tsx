"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { julianDateConverter } from "./transform";
import type { JulianDateConverterOptions } from "./schema";

type Options = JulianDateConverterOptions;

const defaultOptions: Options = {"inputFormat": "auto", "output": "table", "pivotStart": 1970, "dateStyle": "iso"} as Options;

export function JulianDateConverterToolView() {
  const [in0, setIn0] = useState("2024-05-03\n");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => julianDateConverter(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Input"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.inputFormat} onChange={(e) => setOptions((o) => ({ ...o, inputFormat: e.target.value as Options["inputFormat"] }))}>
            <option value={"auto"}>{"Auto-detect"}</option>
            <option value={"gregorian"}>{"Gregorian date"}</option>
            <option value={"julian-calendar"}>{"Julian-calendar date"}</option>
            <option value={"ordinal"}>{"YYYYDDD / YYYY-DDD"}</option>
            <option value={"yyddd"}>{"YYDDD"}</option>
            <option value={"cyyddd"}>{"CYYDDD (JD Edwards)"}</option>
            <option value={"yyyymmdd"}>{"YYYYMMDD"}</option>
            <option value={"jd"}>{"Julian Day (JD)"}</option>
            <option value={"mjd"}>{"Modified JD"}</option>
            <option value={"lilian"}>{"Lilian"}</option>
            <option value={"rata-die"}>{"Rata Die"}</option>
            <option value={"excel1900"}>{"Excel 1900 serial"}</option>
            <option value={"excel1904"}>{"Excel 1904 serial"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Output"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.output} onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}>
            <option value={"table"}>{"All formats"}</option>
            <option value={"gregorian"}>{"Gregorian date"}</option>
            <option value={"julian-calendar"}>{"Julian-calendar date"}</option>
            <option value={"yyddd"}>{"YYDDD"}</option>
            <option value={"cyyddd"}>{"CYYDDD"}</option>
            <option value={"yyyyddd"}>{"YYYYDDD"}</option>
            <option value={"jd"}>{"JD"}</option>
            <option value={"jdn"}>{"JDN"}</option>
            <option value={"mjd"}>{"MJD"}</option>
            <option value={"lilian"}>{"Lilian"}</option>
            <option value={"rata-die"}>{"Rata Die"}</option>
            <option value={"excel1900"}>{"Excel 1900"}</option>
            <option value={"excel1904"}>{"Excel 1904"}</option>
            <option value={"weekday"}>{"Weekday"}</option>
          </select>
        </label>
        {["auto", "yyddd"].includes(String(options.inputFormat)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Two-digit year window starts"}
          <input type="number" min={0} max={9900} value={options.pivotStart} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, pivotStart: Math.min(9900, Math.max(0, n)) })); }} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Date style"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.dateStyle} onChange={(e) => setOptions((o) => ({ ...o, dateStyle: e.target.value as Options["dateStyle"] }))}>
            <option value={"iso"}>{"2024-05-03"}</option>
            <option value={"dmy"}>{"03/05/2024"}</option>
            <option value={"long"}>{"3 May 2024"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Dates (one per line)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"2024-05-03, 24124, 124124, 2460433.5, julian: 1582-10-04, jd 2451545 ..."}
                  aria-label={"Dates (one per line)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Converted"} fileName={"julian.txt"} value={result.output} error={result.error?.message ?? null} placeholder={"Results appear here"} />}
        />
      </div>
    </div>
  );
}
