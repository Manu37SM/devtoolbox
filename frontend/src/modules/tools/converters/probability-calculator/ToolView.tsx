"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { calculateProbability } from "./transform";
import type { ProbabilityCalculatorOptions } from "./schema";

type Options = ProbabilityCalculatorOptions;

const defaultOptions: Options = {"distribution": "binomial", "query": "le", "x": 3, "x2": 6, "significantDigits": 8} as Options;

export function ProbabilityCalculatorToolView() {
  const [in0, setIn0] = useState("n=20, p=0.3");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => calculateProbability(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Distribution"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.distribution} onChange={(e) => setOptions((o) => ({ ...o, distribution: e.target.value as Options["distribution"] }))}>
            <option value={"binomial"}>{"Binomial (n, p)"}</option>
            <option value={"poisson"}>{"Poisson (lambda)"}</option>
            <option value={"geometric"}>{"Geometric (p)"}</option>
            <option value={"hypergeometric"}>{"Hypergeometric (population, successes, draws)"}</option>
            <option value={"normal"}>{"Normal (mu, sigma)"}</option>
            <option value={"exponential"}>{"Exponential (lambda)"}</option>
            <option value={"uniform"}>{"Uniform (a, b)"}</option>
            <option value={"combinatorics"}>{"Combinations (n, k)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Find"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.query} onChange={(e) => setOptions((o) => ({ ...o, query: e.target.value as Options["query"] }))}>
            <option value={"eq"}>{"P(X = x) / density"}</option>
            <option value={"le"}>{"P(X \u2264 x)"}</option>
            <option value={"lt"}>{"P(X < x)"}</option>
            <option value={"ge"}>{"P(X \u2265 x)"}</option>
            <option value={"gt"}>{"P(X > x)"}</option>
            <option value={"between"}>{"P(x \u2264 X \u2264 x2)"}</option>
            <option value={"quantile"}>{"Quantile (x = probability)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"x"}
          <input type="number" min={-1000000000} max={1000000000} step={"any"} value={options.x} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, x: Math.min(1000000000, Math.max(-1000000000, n)) })); }} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"x2"}
          <input type="number" min={-1000000000} max={1000000000} step={"any"} value={options.x2} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, x2: Math.min(1000000000, Math.max(-1000000000, n)) })); }} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Digits"}
          <input type="number" min={3} max={15} value={options.significantDigits} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, significantDigits: Math.min(15, Math.max(3, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Parameters"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"n=10, p=0.3"}
                  aria-label={"Parameters"}
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
