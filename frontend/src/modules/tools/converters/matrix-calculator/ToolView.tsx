"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { calculateMatrix } from "./transform";
import type { MatrixCalculatorOptions } from "./schema";

type Options = MatrixCalculatorOptions;

const defaultOptions: Options = {"operation": "determinant", "exponent": 2, "scalar": "2", "display": "fraction", "decimals": 6} as Options;

export function MatrixCalculatorToolView() {
  const [in0, setIn0] = useState("2 1 3\n0 -1 4\n5 2 1/2");
  const [in1, setIn1] = useState("1\n2\n3");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => calculateMatrix(in0, in1, options), [in0, in1, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Operation"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.operation} onChange={(e) => setOptions((o) => ({ ...o, operation: e.target.value as Options["operation"] }))}>
            <option value={"determinant"}>{"Determinant"}</option>
            <option value={"inverse"}>{"Inverse"}</option>
            <option value={"transpose"}>{"Transpose"}</option>
            <option value={"rank"}>{"Rank"}</option>
            <option value={"trace"}>{"Trace"}</option>
            <option value={"rref"}>{"Row-reduce (RREF)"}</option>
            <option value={"multiply"}>{"A \u00d7 B"}</option>
            <option value={"add"}>{"A + B"}</option>
            <option value={"subtract"}>{"A \u2212 B"}</option>
            <option value={"power"}>{"Power A\u207f"}</option>
            <option value={"scalar"}>{"Scalar \u00d7 A"}</option>
            <option value={"solve"}>{"Solve A\u00b7x = B"}</option>
            <option value={"charpoly"}>{"Characteristic polynomial"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"n"}
          <input type="number" min={-20} max={64} value={options.exponent} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, exponent: Math.min(64, Math.max(-20, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"k"}
          <input type="text" value={options.scalar} placeholder={"2/3"} onChange={(e) => setOptions((o) => ({ ...o, scalar: e.target.value }))} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Show as"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.display} onChange={(e) => setOptions((o) => ({ ...o, display: e.target.value as Options["display"] }))}>
            <option value={"fraction"}>{"Fractions"}</option>
            <option value={"decimal"}>{"Decimals"}</option>
            <option value={"both"}>{"Both"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Decimals"}
          <input type="number" min={0} max={30} value={options.decimals} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, decimals: Math.min(30, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Matrix A (rows on lines, or separated by ;)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"1 2\n3 4"}
                  aria-label={"Matrix A (rows on lines, or separated by ;)"}
                  className="font-mono"
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Matrix B (for A\u00d7B, A\u00b1B, and A\u00b7x = B)"}</label>
                <ToolInput
                  value={in1}
                  onChange={(e) => setIn1(e.target.value)}
                  placeholder={"1\n2"}
                  aria-label={"Matrix B (for A\u00d7B, A\u00b1B, and A\u00b7x = B)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Result"} value={result.output} error={result.error?.message ?? null} placeholder={"Result will appear here"} />}
        />
      </div>
    </div>
  );
}
