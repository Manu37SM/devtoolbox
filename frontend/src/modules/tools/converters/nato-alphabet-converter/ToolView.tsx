"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { convertNato } from "./transform";
import type { NatoAlphabetConverterOptions } from "./schema";

type Options = NatoAlphabetConverterOptions;

const defaultOptions: Options = {"mode":"text-to-nato","icaoDigits":false} as Options;

export function NatoAlphabetConverterToolView() {
  const [input, setInput] = useState("Dev Toolbox 2026");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertNato(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["text-to-nato","Text → NATO"],["nato-to-text","NATO → Text"]] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={options.mode === value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, mode: value as Options["mode"] }))}
            >
              {label}
            </Button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.icaoDigits} onChange={(e) => setOptions((o) => ({ ...o, icaoDigits: e.target.checked }))} />
          ICAO digit pronunciation (Niner, Fife)
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type text, or NATO words separated by spaces and ' / '"
                aria-label="Input"
                
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
