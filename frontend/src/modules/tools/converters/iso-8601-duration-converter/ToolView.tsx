"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";
import { convertIsoDuration } from "./transform";
import type { IsoDurationOptions } from "./schema";

const modes: { value: IsoDurationOptions["mode"]; label: string; placeholder: string }[] = [
  { value: "iso-to-human", label: "ISO → Readable", placeholder: "P1Y2M3DT4H5M6S" },
  { value: "iso-to-seconds", label: "ISO → Seconds", placeholder: "PT1H30M" },
  { value: "seconds-to-iso", label: "Seconds → ISO", placeholder: "5400" },
];

export function Iso8601DurationConverterToolView() {
  const [input, setInput] = useState("P1DT2H30M");
  const [options, setOptions] = useState<IsoDurationOptions>({ mode: "iso-to-human" });

  const result = useMemo(() => convertIsoDuration(input, options), [input, options]);
  const active = modes.find((m) => m.value === options.mode)!;

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
              onClick={() => setOptions({ mode: m.value })}
            >
              {m.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`e.g. ${active.placeholder}`}
                aria-label="Duration input"
              />
            </div>
          }
          output={<OutputPane value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
