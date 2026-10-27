"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { transformBase32 } from "./transform";
import type { Base32Options } from "./schema";

const defaultOptions: Base32Options = { mode: "encode", variant: "rfc4648", padding: true };

export function Base32ConverterToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Base32Options>(defaultOptions);

  const result = useMemo(() => transformBase32(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          {(["encode", "decode"] as const).map((mode) => (
            <Button
              key={mode}
              variant={options.mode === mode ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, mode }))}
            >
              {mode === "encode" ? "Encode" : "Decode"}
            </Button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Alphabet
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.variant}
            onChange={(e) => setOptions((o) => ({ ...o, variant: e.target.value as Base32Options["variant"] }))}
          >
            <option value="rfc4648">RFC 4648</option>
            <option value="base32hex">Base32hex</option>
            <option value="crockford">Crockford</option>
          </select>
        </label>
        {options.mode === "encode" && options.variant !== "crockford" && (
          <label className="flex items-center gap-1.5 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={options.padding}
              onChange={(e) => setOptions((o) => ({ ...o, padding: e.target.checked }))}
            />
            Padding (=)
          </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={options.mode === "encode" ? "Text to encode" : "Base32 string to decode"}
                aria-label="Base32 input"
              />
            </div>
          }
          output={<OutputPane value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
