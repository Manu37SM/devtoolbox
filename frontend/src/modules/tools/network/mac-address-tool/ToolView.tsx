"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";
import { macAddressTool } from "./transform";
import type { MacAddressToolOptions } from "./schema";

type Options = MacAddressToolOptions;

const defaultOptions: Options = {"mode":"convert","style":"colon","upper":true,"details":false,"count":5,"localAdmin":true} as Options;

export function MacAddressToolToolView() {
  const [input, setInput] = useState("00:1A:2B:3C:4D:5E");
  const [options, setOptions] = useState<Options>(defaultOptions);
  const [nonce, setNonce] = useState(0);

  const result = useMemo(() => macAddressTool(input, options, nonce), [input, options, nonce]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["convert","Convert"],["generate","Generate"]] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={options.mode === value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, mode: value as Options["mode"] }))}
            >
              {label}
            </Button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Style
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.style}
            onChange={(e) => setOptions((o) => ({ ...o, style: e.target.value as Options["style"] }))}
          >
            <option value="colon">{"aa:bb:cc"}</option>
            <option value="hyphen">{"aa-bb-cc"}</option>
            <option value="cisco">{"aabb.ccdd.eeff"}</option>
            <option value="plain">{"aabbccddeeff"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.upper} onChange={(e) => setOptions((o) => ({ ...o, upper: e.target.checked }))} />
          Uppercase
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.details} onChange={(e) => setOptions((o) => ({ ...o, details: e.target.checked }))} />
          Show details
        </label>
        {options.mode === "generate" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Count
          <input
            type="number"
            min={1} max={500}
            value={options.count}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, count: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        )}
        {options.mode === "generate" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.localAdmin} onChange={(e) => setOptions((o) => ({ ...o, localAdmin: e.target.checked }))} />
          Locally administered
        </label>
        )}
        <Button variant="ghost" size="sm" onClick={() => setNonce((n) => n + 1)}>
          Regenerate
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">MAC addresses (one per line)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="00:1A:2B:3C:4D:5E"
                aria-label="MAC addresses (one per line)"
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
