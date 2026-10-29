"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { generateSystemdUnit } from "./transform";
import type { SystemdUnitGeneratorOptions } from "./schema";

type Options = SystemdUnitGeneratorOptions;

const defaultOptions: Options = {"type":"simple","restart":"on-failure","restartSec":5,"wantedBy":"multi-user.target","afterNetwork":true,"hardening":true} as Options;

export function SystemdUnitGeneratorToolView() {
  const [input, setInput] = useState("Description=My API service\nExecStart=/usr/bin/node /srv/app/server.js\nUser=app\nWorkingDirectory=/srv/app\nEnvironment=NODE_ENV=production\nEnvironment=PORT=3000");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateSystemdUnit(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Type
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.type}
            onChange={(e) => setOptions((o) => ({ ...o, type: e.target.value as Options["type"] }))}
          >
            <option value="simple">{"simple"}</option>
            <option value="exec">{"exec"}</option>
            <option value="forking">{"forking"}</option>
            <option value="oneshot">{"oneshot"}</option>
            <option value="notify">{"notify"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Restart
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.restart}
            onChange={(e) => setOptions((o) => ({ ...o, restart: e.target.value as Options["restart"] }))}
          >
            <option value="no">{"no"}</option>
            <option value="on-failure">{"on-failure"}</option>
            <option value="always">{"always"}</option>
            <option value="on-abnormal">{"on-abnormal"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Restart delay (s)
          <input
            type="number"
            min={0} max={3600}
            value={options.restartSec}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, restartSec: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          WantedBy
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.wantedBy}
            onChange={(e) => setOptions((o) => ({ ...o, wantedBy: e.target.value as Options["wantedBy"] }))}
          >
            <option value="multi-user.target">{"multi-user.target"}</option>
            <option value="default.target">{"default.target"}</option>
            <option value="graphical.target">{"graphical.target"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.afterNetwork} onChange={(e) => setOptions((o) => ({ ...o, afterNetwork: e.target.checked }))} />
          Wait for network
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.hardening} onChange={(e) => setOptions((o) => ({ ...o, hardening: e.target.checked }))} />
          Sandbox hardening
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Directives (Key=value per line)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ExecStart=/usr/bin/myapp"
                aria-label="Directives (Key=value per line)"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
