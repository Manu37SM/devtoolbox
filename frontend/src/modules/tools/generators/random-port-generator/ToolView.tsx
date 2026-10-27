"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { generatePorts } from "./transform";
import type { RandomPortGeneratorOptions } from "./schema";

type Options = RandomPortGeneratorOptions;

const defaultOptions: Options = {"range":"registered","min":1024,"max":65535,"count":5,"avoidCommon":true,"sorted":true} as Options;

export function RandomPortGeneratorToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);
  const [nonce, setNonce] = useState(0);

  const result = useMemo(() => generatePorts(input, options, nonce), [input, options, nonce]);
  void setInput;
  void input;
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Range
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.range}
            onChange={(e) => setOptions((o) => ({ ...o, range: e.target.value as Options["range"] }))}
          >
            <option value="registered">{"Registered (1024–49151)"}</option>
            <option value="dynamic">{"Dynamic (49152–65535)"}</option>
            <option value="any">{"Any non-privileged (1024–65535)"}</option>
            <option value="custom">{"Custom"}</option>
          </select>
        </label>
        {options.range === "custom" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Min
          <input
            type="number"
            min={1} max={65535}
            value={options.min}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, min: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        )}
        {options.range === "custom" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Max
          <input
            type="number"
            min={1} max={65535}
            value={options.max}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, max: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Count
          <input
            type="number"
            min={1} max={100}
            value={options.count}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, count: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.avoidCommon} onChange={(e) => setOptions((o) => ({ ...o, avoidCommon: e.target.checked }))} />
          Avoid common ports
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.sorted} onChange={(e) => setOptions((o) => ({ ...o, sorted: e.target.checked }))} />
          Sort
        </label>
        <Button variant="ghost" size="sm" onClick={() => setNonce((n) => n + 1)}>
          Regenerate
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <OutputPane label="Ports" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />
      </div>
    </div>
  );
}
