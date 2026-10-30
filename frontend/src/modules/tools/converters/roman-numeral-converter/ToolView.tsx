"use client";

import { useMemo, useState } from "react";
import { convertRomanNumeral } from "./transform";
import { romanNumeralOptionsSchema, type RomanNumeralMode, type RomanNumeralOptions } from "./schema";
import { CopyButton } from "@/components/tools/CopyButton";

export function RomanNumeralConverterToolView() {
  const [input, setInput] = useState("1994");
  const [mode, setMode] = useState<RomanNumeralMode>("to-roman");

  const [options, setOptions] = useState<RomanNumeralOptions>(() => romanNumeralOptionsSchema.parse({}));

  const result = useMemo(() => convertRomanNumeral(input, mode, options), [input, mode, options]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          {mode === "to-roman" ? "Number" : "Roman numeral"}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={Math.min(8, Math.max(1, input.split("\n").length))}
            placeholder={mode === "to-roman" ? "e.g. 1994 (one per line for several)" : "e.g. MCMXCIV"}
            className="w-56 resize-y rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm"
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {mode === "to-roman" && (
          <>
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              Style
              <select
                className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
                value={options.style}
                onChange={(e) => setOptions((o) => ({ ...o, style: e.target.value as RomanNumeralOptions["style"] }))}
              >
                <option value="ascii">MCMXCIV</option>
                <option value="unicode">Unicode ⅯⅭⅯⅩⅭⅠⅤ</option>
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={options.lowercase}
                onChange={(e) => setOptions((o) => ({ ...o, lowercase: e.target.checked }))}
              />
              Lower-case
            </label>
          </>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.vinculum}
            onChange={(e) => setOptions((o) => ({ ...o, vinculum: e.target.checked }))}
          />
          Large numbers (vinculum, up to 3,999,999)
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.clockFour}
            onChange={(e) => setOptions((o) => ({ ...o, clockFour: e.target.checked }))}
          />
          Clock-face IIII
        </label>
        {mode === "from-roman" && (
          <label className="flex items-center gap-1.5 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={options.strict}
              onChange={(e) => setOptions((o) => ({ ...o, strict: e.target.checked }))}
            />
            Strict (reject IIIII, IC…)
          </label>
        )}
      </div>
      {result.error ? (
        <div role="alert" className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
          {result.error.message}
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-raised px-3 py-2">
          <div>
            <div className="text-xs text-text-muted">{mode === "to-roman" ? "Roman numeral" : "Number"}</div>
            <div className="whitespace-pre-wrap break-all font-mono text-lg text-text-primary">{result.output || "—"}</div>
          </div>
          <CopyButton value={result.output} />
        </div>
      )}
    </div>
  );
}
