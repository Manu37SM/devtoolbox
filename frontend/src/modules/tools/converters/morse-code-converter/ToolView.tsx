"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";
import { convertMorse } from "./transform";
import type { MorseCodeOptions } from "./schema";

const modes: { value: MorseCodeOptions["mode"]; label: string }[] = [
  { value: "text-to-morse", label: "Text → Morse" },
  { value: "morse-to-text", label: "Morse → Text" },
];

export function MorseCodeConverterToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<MorseCodeOptions>({ mode: "text-to-morse" });

  const result = useMemo(() => convertMorse(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          {modes.map((m) => (
            <Button
              key={m.value}
              variant={options.mode === m.value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions({ mode: m.value })}
            >
              {m.label}
            </Button>
          ))}
        </div>
        <span className="text-xs text-text-muted">
          Letters are space-separated; words are separated by &quot; / &quot;.
        </span>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={options.mode === "text-to-morse" ? "Type text to encode" : "... --- ... / .... . .-.. .--."}
                aria-label="Morse converter input"
              />
            </div>
          }
          output={<OutputPane onSwap={() => setOptions((o) => ({ ...o, mode: o.mode === "text-to-morse" ? "morse-to-text" : o.mode === "morse-to-text" ? "text-to-morse" : o.mode }))} value={result.output} error={result.error?.message ?? null} placeholder="Converted output will appear here" />}
        />
      </div>
    </div>
  );
}
