"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { convertCssLengths } from "./transform";
import type { CssLengthUnit, PxRemOptions } from "./schema";

const UNITS: CssLengthUnit[] = ["px", "rem", "em", "pt", "%"];

export function PxRemConverterToolView() {
  const [input, setInput] = useState("16\n24px\n1.5rem");
  const [options, setOptions] = useState<PxRemOptions>({ baseFontSize: 16, defaultUnit: "px", target: "all" });
  const [baseInput, setBaseInput] = useState("16");

  const result = useMemo(() => convertCssLengths(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Base font size (px)
          <input
            type="number"
            min={1}
            max={1000}
            value={baseInput}
            onChange={(e) => {
              setBaseInput(e.target.value);
              const parsed = Number(e.target.value);
              if (Number.isFinite(parsed) && parsed > 0 && parsed <= 1000) {
                setOptions((o) => ({ ...o, baseFontSize: parsed }));
              }
            }}
            className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Unitless values are
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.defaultUnit}
            onChange={(e) => setOptions((o) => ({ ...o, defaultUnit: e.target.value as CssLengthUnit }))}
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Convert to
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.target}
            onChange={(e) => setOptions((o) => ({ ...o, target: e.target.value as PxRemOptions["target"] }))}
          >
            <option value="all">All units</option>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Lengths (one per line)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"16\n1.5rem\n12pt"}
                aria-label="CSS lengths input"
              />
            </div>
          }
          output={<OutputPane value={result.output} error={result.error?.message ?? null} placeholder="Converted lengths will appear here" />}
        />
      </div>
    </div>
  );
}
