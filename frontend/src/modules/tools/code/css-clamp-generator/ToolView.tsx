"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";


import { generateClamp } from "./transform";
import type { CssClampGeneratorOptions } from "./schema";

type Options = CssClampGeneratorOptions;

const defaultOptions: Options = {"minSize":16,"maxSize":24,"minViewport":320,"maxViewport":1280,"unit":"rem","rootPx":16} as Options;

export function CssClampGeneratorToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateClamp(input, options), [input, options]);
  void setInput;
  void input;
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Min size (px)
          <input
            type="number"
            min={0} 
            value={options.minSize}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, minSize: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Max size (px)
          <input
            type="number"
            min={0} 
            value={options.maxSize}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, maxSize: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Min viewport (px)
          <input
            type="number"
            min={0} 
            value={options.minViewport}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, minViewport: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Max viewport (px)
          <input
            type="number"
            min={1} 
            value={options.maxViewport}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, maxViewport: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output unit
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.unit}
            onChange={(e) => setOptions((o) => ({ ...o, unit: e.target.value as Options["unit"] }))}
          >
            <option value="rem">{"rem"}</option>
            <option value="px">{"px"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Root font size (px)
          <input
            type="number"
            min={1} 
            value={options.rootPx}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, rootPx: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <OutputPane label="CSS" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />
      </div>
    </div>
  );
}
