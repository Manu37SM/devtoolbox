"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { convertPunycode } from "./transform";
import type { PunycodeMode, PunycodeOptions } from "./schema";

export function PunycodeIdnConverterToolView() {
  const [input, setInput] = useState("münchen.de");
  const [mode, setMode] = useState<PunycodeMode>("encode");

  const [options, setOptions] = useState<PunycodeOptions>({ normalize: true, checkSpoofing: true });
  const result = useMemo(() => convertPunycode(input, mode, options), [input, mode, options]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          {mode === "encode" ? "Unicode domain" : "Punycode (ASCII) domain"}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={Math.min(8, Math.max(1, input.split("\n").length))}
            placeholder={mode === "encode" ? "münchen.de, https://bücher.example/x or a@bücher.example — one per line" : "e.g. xn--mnchen-3ya.de"}
            className="w-96 max-w-full resize-y rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm"
            aria-label={mode === "encode" ? "Unicode domain input" : "Punycode domain input"}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Direction
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as PunycodeMode)}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-2"
          >
            <option value="encode">Unicode → Punycode</option>
            <option value="decode">Punycode → Unicode</option>
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {mode === "encode" && (
          <label className="flex items-center gap-1.5 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={options.normalize}
              onChange={(e) => setOptions((o) => ({ ...o, normalize: e.target.checked }))}
            />
            Normalise like browsers (case, full-width, 。)
          </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.checkSpoofing}
            onChange={(e) => setOptions((o) => ({ ...o, checkSpoofing: e.target.checked }))}
          />
          Warn about look-alike (homograph) domains
        </label>
      </div>
      {result.warnings && result.warnings.length > 0 && (
        <ul role="status" className="list-disc rounded-md border border-warning/40 bg-warning/5 py-2 pl-7 pr-3 text-xs text-warning">
          {result.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <div className="min-h-[100px]">
        <OutputPane
          onSwap={() => setMode((m) => (m === "encode" ? "decode" : "encode"))}
          value={result.output}
          error={result.error?.message ?? null}
          label={mode === "encode" ? "Punycode (ASCII) domain" : "Unicode domain"}
          placeholder="Result will appear here"
        />
      </div>
    </div>
  );
}
