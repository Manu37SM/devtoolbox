"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { geohashPlusCodeConverter } from "./transform";
import type { GeohashPlusCodeConverterOptions } from "./schema";

type Options = GeohashPlusCodeConverterOptions;

const defaultOptions: Options = {"geohashPrecision": 9, "plusLength": 10, "bounds": true, "neighbors": false, "decimals": 6} as Options;

export function GeohashPlusCodeConverterToolView() {
  const [in0, setIn0] = useState("47.3656, 8.5250\nu0qj3yxsw\n8FVC9G8F+6X");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => geohashPlusCodeConverter(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Geohash length"}
          <input type="number" min={1} max={12} step={1} value={options.geohashPrecision} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, geohashPrecision: Math.min(12, Math.max(1, n)) })); }} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Plus Code digits"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.plusLength} onChange={(e) => setOptions((o) => ({ ...o, plusLength: Number(e.target.value) }))}>
            <option value={"2"}>{"2 (~2200 km)"}</option>
            <option value={"4"}>{"4 (~110 km)"}</option>
            <option value={"6"}>{"6 (~5.5 km)"}</option>
            <option value={"8"}>{"8 (~275 m)"}</option>
            <option value={"10"}>{"10 (~14 m)"}</option>
            <option value={"11"}>{"11 (~3.5 m)"}</option>
            <option value={"12"}>{"12 (~90 cm)"}</option>
            <option value={"13"}>{"13 (~22 cm)"}</option>
            <option value={"14"}>{"14 (~5 cm)"}</option>
            <option value={"15"}>{"15 (~1 cm)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Decimals"}
          <input type="number" min={1} max={12} step={1} value={options.decimals} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, decimals: Math.min(12, Math.max(1, n)) })); }} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.bounds} onChange={(e) => setOptions((o) => ({ ...o, bounds: e.target.checked }))} />
          {"Cell bounds & size"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.neighbors} onChange={(e) => setOptions((o) => ({ ...o, neighbors: e.target.checked }))} />
          {"Geohash neighbours"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Coordinates, geohashes or Plus Codes (one per line)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"47.3656, 8.5250\nu0qj3yxsw\n8FVC9G8F+6X"}
                  aria-label={"Coordinates, geohashes or Plus Codes (one per line)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Conversions"} fileName={"geo-codes.txt"} value={result.output} error={result.error?.message ?? null} placeholder={"Enter lat, lng or a code"} />}
        />
      </div>
    </div>
  );
}
