"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { calculateNumberTheory } from "./transform";
import type { NumberTheoryCalculatorOptions } from "./schema";

type Options = NumberTheoryCalculatorOptions;

const defaultOptions: Options = {"operation":"analyze"} as Options;

export function NumberTheoryCalculatorToolView() {
  const [input, setInput] = useState("360 97 600851475143");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => calculateNumberTheory(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Operation
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.operation}
            onChange={(e) => setOptions((o) => ({ ...o, operation: e.target.value as Options["operation"] }))}
          >
            <option value="analyze">{"Analyze numbers"}</option>
            <option value="gcd-lcm">{"GCD / LCM"}</option>
            <option value="fibonacci">{"Fibonacci F(n)"}</option>
            <option value="factorial">{"Factorial n!"}</option>
            <option value="primes-up-to">{"Primes up to n"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Integers (space, comma or newline separated)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="360 97 600851475143"
                aria-label="Integers (space, comma or newline separated)"
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
