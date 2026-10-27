"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";


import { calcDownloadTime } from "./transform";
import type { DownloadTimeCalculatorOptions } from "./schema";

type Options = DownloadTimeCalculatorOptions;

const defaultOptions: Options = {"speed":100,"speedUnit":"Mbps","efficiency":90} as Options;

export function DownloadTimeCalculatorToolView() {
  const [input, setInput] = useState("4.5 GB\n700 MiB\n1 TB");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => calcDownloadTime(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Speed
          <input
            type="number"
            min={0} 
            value={options.speed}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, speed: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Unit
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.speedUnit}
            onChange={(e) => setOptions((o) => ({ ...o, speedUnit: e.target.value as Options["speedUnit"] }))}
          >
            <option value="Kbps">{"Kbps"}</option>
            <option value="Mbps">{"Mbps"}</option>
            <option value="Gbps">{"Gbps"}</option>
            <option value="MBps">{"MB/s"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Efficiency %
          <input
            type="number"
            min={1} max={100}
            value={options.efficiency}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, efficiency: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">File sizes (one per line)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="4.5 GB"
                aria-label="File sizes (one per line)"
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
