"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { sudoersGenerator } from "./transform";
import type { SudoersGeneratorOptions } from "./schema";

type Options = SudoersGeneratorOptions;

const defaultOptions: Options = {"host": "ALL", "runAs": "ALL", "noPasswd": false, "noExec": true, "setEnv": false, "logOutput": false, "useAliases": false, "timestampTimeout": -1, "logfile": "", "header": true} as Options;

export function SudoersGeneratorToolView() {
  const [in0, setIn0] = useState("deploy: /usr/bin/systemctl restart myapp, /usr/bin/systemctl status myapp");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => sudoersGenerator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Host"}
          <input type="text" value={options.host} placeholder={"ALL"} onChange={(e) => setOptions((o) => ({ ...o, host: e.target.value }))} className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Run as"}
          <input type="text" value={options.runAs} placeholder={"ALL or root"} onChange={(e) => setOptions((o) => ({ ...o, runAs: e.target.value }))} className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Password cache (min, -1 = default)"}
          <input type="number" min={-1} max={1440} step={1} value={options.timestampTimeout} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, timestampTimeout: Math.min(1440, Math.max(-1, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Logfile"}
          <input type="text" value={options.logfile} placeholder={"/var/log/sudo.log"} onChange={(e) => setOptions((o) => ({ ...o, logfile: e.target.value }))} className="w-44 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.noPasswd} onChange={(e) => setOptions((o) => ({ ...o, noPasswd: e.target.checked }))} />
          {"NOPASSWD"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.noExec} onChange={(e) => setOptions((o) => ({ ...o, noExec: e.target.checked }))} />
          {"NOEXEC"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.setEnv} onChange={(e) => setOptions((o) => ({ ...o, setEnv: e.target.checked }))} />
          {"SETENV"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.logOutput} onChange={(e) => setOptions((o) => ({ ...o, logOutput: e.target.checked }))} />
          {"LOG_OUTPUT"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.useAliases} onChange={(e) => setOptions((o) => ({ ...o, useAliases: e.target.checked }))} />
          {"Cmnd_Alias per rule"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.header} onChange={(e) => setOptions((o) => ({ ...o, header: e.target.checked }))} />
          {"Header & warnings"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Rules (user: command, command)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"deploy: /usr/bin/systemctl restart myapp\n%ops: /usr/bin/journalctl -u myapp"}
                  aria-label={"Rules (user: command, command)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"/etc/sudoers.d/ file"} fileName={"sudoers-rule"} value={result.output} error={result.error?.message ?? null} placeholder={"Add a rule such as: deploy: /usr/bin/systemctl restart myapp"} />}
        />
      </div>
    </div>
  );
}
