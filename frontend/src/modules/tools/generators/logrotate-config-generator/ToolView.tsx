"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { logrotateConfigGenerator } from "./transform";
import type { LogrotateConfigGeneratorOptions } from "./schema";

type Options = LogrotateConfigGeneratorOptions;

const defaultOptions: Options = {"frequency": "daily", "rotate": 14, "compress": "gzip", "delayCompress": true, "missingOk": true, "notIfEmpty": true, "method": "create", "createMode": "0640", "createUser": "", "createGroup": "", "dateExt": false, "dateFormat": "-%Y%m%d", "maxSize": "", "minSize": "", "maxAge": 0, "suUser": "", "suGroup": "", "shared": false, "postrotate": "", "prerotate": "", "olddir": ""} as Options;

export function LogrotateConfigGeneratorToolView() {
  const [in0, setIn0] = useState("/var/log/myapp/*.log");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => logrotateConfigGenerator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Rotate"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.frequency} onChange={(e) => setOptions((o) => ({ ...o, frequency: e.target.value as Options["frequency"] }))}>
            <option value={"daily"}>{"Daily"}</option>
            <option value={"weekly"}>{"Weekly"}</option>
            <option value={"monthly"}>{"Monthly"}</option>
            <option value={"yearly"}>{"Yearly"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Keep"}
          <input type="number" min={0} max={3650} step={1} value={options.rotate} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, rotate: Math.min(3650, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Compression"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.compress} onChange={(e) => setOptions((o) => ({ ...o, compress: e.target.value as Options["compress"] }))}>
            <option value={"gzip"}>{"gzip"}</option>
            <option value={"xz"}>{"xz"}</option>
            <option value={"zstd"}>{"zstd"}</option>
            <option value={"bzip2"}>{"bzip2"}</option>
            <option value={"none"}>{"None"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"After rotate"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.method} onChange={(e) => setOptions((o) => ({ ...o, method: e.target.value as Options["method"] }))}>
            <option value={"create"}>{"create new file"}</option>
            <option value={"copytruncate"}>{"copytruncate"}</option>
            <option value={"none"}>{"nothing"}</option>
          </select>
        </label>
        {["create"].includes(String(options.method)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Mode"}
          <input type="text" value={options.createMode} placeholder={"0640"} onChange={(e) => setOptions((o) => ({ ...o, createMode: e.target.value }))} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["create"].includes(String(options.method)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Owner"}
          <input type="text" value={options.createUser} placeholder={"root"} onChange={(e) => setOptions((o) => ({ ...o, createUser: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["create"].includes(String(options.method)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Group"}
          <input type="text" value={options.createGroup} placeholder={"adm"} onChange={(e) => setOptions((o) => ({ ...o, createGroup: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Max size"}
          <input type="text" value={options.maxSize} placeholder={"100M"} onChange={(e) => setOptions((o) => ({ ...o, maxSize: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Min size"}
          <input type="text" value={options.minSize} placeholder={"1M"} onChange={(e) => setOptions((o) => ({ ...o, minSize: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Max age (days, 0 = off)"}
          <input type="number" min={0} max={3650} step={1} value={options.maxAge} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, maxAge: Math.min(3650, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"su user"}
          <input type="text" value={options.suUser} placeholder={"www-data"} onChange={(e) => setOptions((o) => ({ ...o, suUser: e.target.value }))} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"su group"}
          <input type="text" value={options.suGroup} placeholder={"adm"} onChange={(e) => setOptions((o) => ({ ...o, suGroup: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"olddir"}
          <input type="text" value={options.olddir} placeholder={"/var/log/old"} onChange={(e) => setOptions((o) => ({ ...o, olddir: e.target.value }))} className="w-36 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"postrotate"}
          <input type="text" value={options.postrotate} placeholder={"systemctl reload myapp"} onChange={(e) => setOptions((o) => ({ ...o, postrotate: e.target.value }))} className="w-56 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"prerotate"}
          <input type="text" value={options.prerotate} placeholder={""} onChange={(e) => setOptions((o) => ({ ...o, prerotate: e.target.value }))} className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.delayCompress} onChange={(e) => setOptions((o) => ({ ...o, delayCompress: e.target.checked }))} />
          {"delaycompress"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.missingOk} onChange={(e) => setOptions((o) => ({ ...o, missingOk: e.target.checked }))} />
          {"missingok"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.notIfEmpty} onChange={(e) => setOptions((o) => ({ ...o, notIfEmpty: e.target.checked }))} />
          {"notifempty"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.shared} onChange={(e) => setOptions((o) => ({ ...o, shared: e.target.checked }))} />
          {"sharedscripts"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.dateExt} onChange={(e) => setOptions((o) => ({ ...o, dateExt: e.target.checked }))} />
          {"dateext"}
        </label>
        {["true"].includes(String(options.dateExt)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"dateformat"}
          <input type="text" value={options.dateFormat} placeholder={"-%Y%m%d"} onChange={(e) => setOptions((o) => ({ ...o, dateFormat: e.target.value }))} className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Log files (one path or glob per line)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"/var/log/myapp/*.log"}
                  aria-label={"Log files (one path or glob per line)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"logrotate config"} fileName={"myapp.logrotate"} value={result.output} error={result.error?.message ?? null} placeholder={"Add one or more log paths"} />}
        />
      </div>
    </div>
  );
}
