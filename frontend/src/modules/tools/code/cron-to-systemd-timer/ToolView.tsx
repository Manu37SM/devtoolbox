"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { convertCronToSystemd } from "./transform";
import type { CronToSystemdTimerOptions } from "./schema";

type Options = CronToSystemdTimerOptions;

const defaultOptions: Options = {"unitName": "backup", "command": "/usr/local/bin/backup.sh", "description": "", "user": "", "persistent": true, "randomizedDelaySec": 0, "timezone": "", "output": "units"} as Options;

export function CronToSystemdTimerToolView() {
  const [in0, setIn0] = useState("30 2 * * 1-5");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertCronToSystemd(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Output"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.output} onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}>
            <option value={"units"}>{".timer + .service"}</option>
            <option value={"oncalendar"}>{"OnCalendar only"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Unit name"}
          <input type="text" value={options.unitName} placeholder={"backup"} onChange={(e) => setOptions((o) => ({ ...o, unitName: e.target.value }))} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Command"}
          <input type="text" value={options.command} placeholder={"/usr/local/bin/backup.sh"} onChange={(e) => setOptions((o) => ({ ...o, command: e.target.value }))} className="w-56 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"User"}
          <input type="text" value={options.user} placeholder={"root"} onChange={(e) => setOptions((o) => ({ ...o, user: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Timezone"}
          <input type="text" value={options.timezone} placeholder={"UTC"} onChange={(e) => setOptions((o) => ({ ...o, timezone: e.target.value }))} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Random delay (s)"}
          <input type="number" min={0} max={86400} value={options.randomizedDelaySec} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, randomizedDelaySec: Math.min(86400, Math.max(0, n)) })); }} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.persistent} onChange={(e) => setOptions((o) => ({ ...o, persistent: e.target.checked }))} />
          {"Persistent"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Cron expression"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"*/15 9-17 * * 1-5"}
                  aria-label={"Cron expression"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"systemd units"} fileName={"backup.timer"} value={result.output} error={result.error?.message ?? null} placeholder={"Units will appear here"} />}
        />
      </div>
    </div>
  );
}
