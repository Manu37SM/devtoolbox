"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { convertIban } from "./transform";
import type { IbanValidatorOptions } from "./schema";

type Options = IbanValidatorOptions;

const defaultOptions: Options = {"format":"grouped"} as Options;

export function IbanValidatorToolView() {
  const [input, setInput] = useState("GB82 WEST 1234 5698 7654 32\nDE89 3704 0044 0532 0130 00");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertIban(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Display
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.format}
            onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}
          >
            <option value="grouped">{"Grouped (4)"}</option>
            <option value="compact">{"Compact"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">IBANs (one per line)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="GB82 WEST 1234 5698 7654 32"
                aria-label="IBANs (one per line)"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
