"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { transformHexText } from "./transform";
import type { HexTextOptions } from "./schema";

const defaultOptions: HexTextOptions = { mode: "text-to-hex", hexSeparator: "space" };

const modes: { value: HexTextOptions["mode"]; label: string }[] = [
  { value: "text-to-hex", label: "Text → Hex" },
  { value: "hex-to-text", label: "Hex → Text" },
  { value: "text-to-binary", label: "Text → Binary" },
  { value: "binary-to-text", label: "Binary → Text" },
];

export function HexTextToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<HexTextOptions>(defaultOptions);

  const result = useMemo(() => transformHexText(input, options), [input, options]);
  const isHexMode = options.mode === "text-to-hex" || options.mode === "hex-to-text";

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {modes.map((m) => (
            <Button
              key={m.value}
              variant={options.mode === m.value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, mode: m.value }))}
            >
              {m.label}
            </Button>
          ))}
        </div>
        {isHexMode && (
          <label className="flex items-center gap-1.5 text-sm text-text-secondary">
            Hex separator
            <select
              className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
              value={options.hexSeparator}
              onChange={(e) =>
                setOptions((o) => ({
                  ...o,
                  hexSeparator: e.target.value as HexTextOptions["hexSeparator"],
                }))
              }
            >
              <option value="space">Space-separated</option>
              <option value="none">No separator</option>
            </select>
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
                placeholder="Type text, hex, or binary depending on the selected mode"
                aria-label="Hex/Text input"
              />
            </div>
          }
          output={
            <OutputPane
              value={result.output}
              error={result.error?.message ?? null}
              placeholder="Converted output will appear here"
            />
          }
        />
      </div>
    </div>
  );
}
