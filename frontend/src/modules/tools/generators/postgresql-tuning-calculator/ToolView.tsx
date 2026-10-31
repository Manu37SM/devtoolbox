"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { postgresqlTuningCalculator } from "./transform";
import type { PostgresqlTuningCalculatorOptions } from "./schema";

type Options = PostgresqlTuningCalculatorOptions;

const defaultOptions: Options = {"ram": 16, "ramUnit": "GB", "cpus": 4, "dbType": "web", "storage": "ssd", "version": 16, "maxConnections": 0, "format": "conf", "extras": true, "explain": true} as Options;

export function PostgresqlTuningCalculatorToolView() {

  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => postgresqlTuningCalculator("", options), [options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"RAM"}
          <input type="number" min={1} max={65536} step={1} value={options.ram} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, ram: Math.min(65536, Math.max(1, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Unit"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.ramUnit} onChange={(e) => setOptions((o) => ({ ...o, ramUnit: e.target.value as Options["ramUnit"] }))}>
            <option value={"GB"}>{"GB"}</option>
            <option value={"MB"}>{"MB"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"CPUs"}
          <input type="number" min={1} max={1024} value={options.cpus} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, cpus: Math.min(1024, Math.max(1, n)) })); }} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Workload"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.dbType} onChange={(e) => setOptions((o) => ({ ...o, dbType: e.target.value as Options["dbType"] }))}>
            <option value={"web"}>{"Web app"}</option>
            <option value={"oltp"}>{"OLTP"}</option>
            <option value={"dw"}>{"Data warehouse"}</option>
            <option value={"desktop"}>{"Desktop"}</option>
            <option value={"mixed"}>{"Mixed"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Storage"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.storage} onChange={(e) => setOptions((o) => ({ ...o, storage: e.target.value as Options["storage"] }))}>
            <option value={"ssd"}>{"SSD / NVMe"}</option>
            <option value={"hdd"}>{"HDD"}</option>
            <option value={"san"}>{"SAN / cloud volume"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"PostgreSQL"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.version} onChange={(e) => setOptions((o) => ({ ...o, version: Number(e.target.value) }))}>
            <option value={"18"}>{"18"}</option>
            <option value={"17"}>{"17"}</option>
            <option value={"16"}>{"16"}</option>
            <option value={"15"}>{"15"}</option>
            <option value={"14"}>{"14"}</option>
            <option value={"13"}>{"13"}</option>
            <option value={"12"}>{"12"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"max_connections (0 = default)"}
          <input type="number" min={0} max={10000} value={options.maxConnections} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, maxConnections: Math.min(10000, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Format"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.format} onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}>
            <option value={"conf"}>{"postgresql.conf"}</option>
            <option value={"alter-system"}>{"ALTER SYSTEM"}</option>
            <option value={"docker"}>{"docker -c flags"}</option>
            <option value={"json"}>{"JSON"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.extras} onChange={(e) => setOptions((o) => ({ ...o, extras: e.target.checked }))} />
          {"Monitoring extras"}
        </label>
        {["conf"].includes(String(options.format)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.explain} onChange={(e) => setOptions((o) => ({ ...o, explain: e.target.checked }))} />
          {"Explain values"}
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <OutputPane label={"Settings"} fileName={"postgresql.conf"} value={result.output} error={result.error?.message ?? null} placeholder={"Set your hardware"} />
      </div>
    </div>
  );
}
