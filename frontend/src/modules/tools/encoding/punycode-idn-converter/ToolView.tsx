"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { convertPunycode } from "./transform";
import type { PunycodeMode } from "./schema";

export function PunycodeIdnConverterToolView() {
  const [input, setInput] = useState("münchen.de");
  const [mode, setMode] = useState<PunycodeMode>("encode");

  const result = useMemo(() => convertPunycode(input, mode), [input, mode]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          {mode === "encode" ? "Unicode domain" : "Punycode (ASCII) domain"}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "encode" ? "e.g. münchen.de" : "e.g. xn--mnchen-3ya.de"}
            className="w-72 rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm"
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

      <div className="min-h-[100px]">
        <OutputPane
          value={result.output}
          error={result.error?.message ?? null}
          label={mode === "encode" ? "Punycode (ASCII) domain" : "Unicode domain"}
          placeholder="Result will appear here"
        />
      </div>
    </div>
  );
}
