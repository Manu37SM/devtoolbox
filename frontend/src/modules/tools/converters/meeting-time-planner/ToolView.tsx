"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { meetingTimePlanner } from "./transform";
import type { MeetingTimePlannerOptions } from "./schema";

type Options = MeetingTimePlannerOptions;

const defaultOptions: Options = {"date": "", "meetingMinutes": 60, "stepMinutes": "30", "hours": "9-18", "weekend": "sat-sun", "view": "windows", "clock": "24", "compromises": true} as Options;

export function MeetingTimePlannerToolView() {
  const [in0, setIn0] = useState("Asha | Mumbai\nBen | New York | 8-17\nLondon | 9-18\nTokyo");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => meetingTimePlanner(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Date (first zone)"}
          <input type="text" value={options.date} placeholder={"2026-11-03"} onChange={(e) => setOptions((o) => ({ ...o, date: e.target.value }))} className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Length (min)"}
          <input type="number" min={5} max={480} value={options.meetingMinutes} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, meetingMinutes: Math.min(480, Math.max(5, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Step"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.stepMinutes} onChange={(e) => setOptions((o) => ({ ...o, stepMinutes: e.target.value as Options["stepMinutes"] }))}>
            <option value={"15"}>{"15 min"}</option>
            <option value={"30"}>{"30 min"}</option>
            <option value={"60"}>{"60 min"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Default hours"}
          <input type="text" value={options.hours} placeholder={"9-18"} onChange={(e) => setOptions((o) => ({ ...o, hours: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Weekend"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.weekend} onChange={(e) => setOptions((o) => ({ ...o, weekend: e.target.value as Options["weekend"] }))}>
            <option value={"sat-sun"}>{"Sat\u2013Sun"}</option>
            <option value={"fri-sat"}>{"Fri\u2013Sat"}</option>
            <option value={"fri"}>{"Fri only"}</option>
            <option value={"none"}>{"Ignore"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"View"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.view} onChange={(e) => setOptions((o) => ({ ...o, view: e.target.value as Options["view"] }))}>
            <option value={"windows"}>{"Windows"}</option>
            <option value={"grid"}>{"24 h grid"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Clock"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.clock} onChange={(e) => setOptions((o) => ({ ...o, clock: e.target.value as Options["clock"] }))}>
            <option value={"24"}>{"24-hour"}</option>
            <option value={"12"}>{"12-hour"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.compromises} onChange={(e) => setOptions((o) => ({ ...o, compromises: e.target.checked }))} />
          {"Show compromises"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Participants (label | city or IANA zone | hours)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"Asha | Mumbai\nBen | New York | 8-17\nLondon"}
                  aria-label={"Participants (label | city or IANA zone | hours)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Overlap"} fileName={"meeting-times.txt"} value={result.output} error={result.error?.message ?? null} placeholder={"Add a participant such as: Asha | Mumbai"} />}
        />
      </div>
    </div>
  );
}
