"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { complexNumberCalculator } from "./transform";
import type { ComplexNumberCalculatorOptions } from "./schema";

type Options = ComplexNumberCalculatorOptions;

const defaultOptions: Options = {"mode": "evaluate", "form": "all", "angleUnit": "deg", "precision": 8, "n": 3, "unit": "i"} as Options;

export function ComplexNumberCalculatorToolView() {
  const [in0, setIn0] = useState("z1 = 3+4i\nz2 = 5\u222030\u00b0\nz1*z2\nsqrt(-4)\ne^(i*pi)");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => complexNumberCalculator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Mode"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.mode} onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}>
            <option value={"evaluate"}>{"Evaluate expressions"}</option>
            <option value={"nthroots"}>{"nth roots of z"}</option>
            <option value={"polynomial"}>{"Polynomial roots"}</option>
          </select>
        </label>
        {["nthroots"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"n"}
          <input type="number" min={1} max={360} value={options.n} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, n: Math.min(360, Math.max(1, n)) })); }} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        {["evaluate"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Show"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.form} onChange={(e) => setOptions((o) => ({ ...o, form: e.target.value as Options["form"] }))}>
            <option value={"all"}>{"All forms"}</option>
            <option value={"rectangular"}>{"Rectangular"}</option>
            <option value={"polar"}>{"Polar"}</option>
            <option value={"exponential"}>{"Exponential"}</option>
          </select>
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Angles"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.angleUnit} onChange={(e) => setOptions((o) => ({ ...o, angleUnit: e.target.value as Options["angleUnit"] }))}>
            <option value={"deg"}>{"Degrees"}</option>
            <option value={"rad"}>{"Radians"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Digits"}
          <input type="number" min={1} max={15} value={options.precision} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, precision: Math.min(15, Math.max(1, n)) })); }} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Imaginary unit"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.unit} onChange={(e) => setOptions((o) => ({ ...o, unit: e.target.value as Options["unit"] }))}>
            <option value={"i"}>{"i"}</option>
            <option value={"j"}>{"j"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Expressions"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"One per line: z1 = 3+4i \u00b7 z1*(1-2i) \u00b7 5\u222030\u00b0 \u00b7 sqrt(-4) \u00b7 roots(1, 4)  |  polynomial: coefficients  1 -6 11 -6"}
                  aria-label={"Expressions"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Results"} fileName={"complex.txt"} value={result.output} error={result.error?.message ?? null} placeholder={"Results appear here"} />}
        />
      </div>
    </div>
  );
}
