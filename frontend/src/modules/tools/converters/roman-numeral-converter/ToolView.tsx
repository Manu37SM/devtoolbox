"use client";

import { useMemo, useState } from "react";
import { convertRomanNumeral } from "./transform";
import type { RomanNumeralMode } from "./schema";
import { CopyButton } from "@/components/tools/CopyButton";

export function RomanNumeralConverterToolView() {
  const [input, setInput] = useState("1994");
  const [mode, setMode] = useState<RomanNumeralMode>("to-roman");

  const result = useMemo(() => convertRomanNumeral(input, mode), [input, mode]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          {mode === "to-roman" ? "Number" : "Roman numeral"}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "to-roman" ? "e.g. 1994" : "e.g. MCMXCIV"}
            className="w-56 rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm"
            aria-label={mode === "to-roman" ? "Number input" : "Roman numeral input"}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Direction
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as RomanNumeralMode)}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-2"
          >
            <option value="to-roman">Number → Roman</option>
            <option value="from-roman">Roman → Number</option>
          </select>
        </label>
      </div>

      {result.error ? (
        <div role="alert" className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
          {result.error.message}
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-raised px-3 py-2">
          <div>
            <div className="text-xs text-text-muted">{mode === "to-roman" ? "Roman numeral" : "Number"}</div>
            <div className="break-all font-mono text-lg text-text-primary">{result.output || "—"}</div>
          </div>
          <CopyButton value={result.output} />
        </div>
      )}
    </div>
  );
}
