"use client";

import { useMemo, useState } from "react";
import { convertColor } from "./transform";
import { CopyButton } from "@/components/tools/CopyButton";

export function ColorConverterToolView() {
  const [input, setInput] = useState("#4f46e5");
  const result = useMemo(() => convertColor(input), [input]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-3">
        <div
          className="h-12 w-12 flex-shrink-0 rounded-md border border-border-default"
          style={{ backgroundColor: result.error ? "transparent" : input }}
          aria-hidden="true"
        />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm"
          aria-label="Color input"
          placeholder="#4f46e5, rgb(79,70,229), hsl(243,75%,59%)"
        />
      </div>
      {result.error ? (
        <p role="alert" className="text-sm text-danger">{result.error}</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(
            [
              ["HEX", result.hex],
              ["RGB", result.rgb],
              ["HSL", result.hsl],
              ["CMYK", result.cmyk],
            ] as const
          ).map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-raised px-3 py-2"
            >
              <div>
                <div className="text-xs text-text-muted">{label}</div>
                <div className="font-mono text-sm text-text-primary">{value}</div>
              </div>
              <CopyButton value={value} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
