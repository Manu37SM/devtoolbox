"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { validateCodes } from "./transform";
import type { IsbnGtinValidatorOptions } from "./schema";

type Options = IsbnGtinValidatorOptions;

const defaultOptions: Options = {"convertIsbn":true} as Options;

export function IsbnGtinValidatorToolView() {
  const [input, setInput] = useState("0-306-40615-2\n978-0-306-40615-7\n4006381333931\n036000291452\n4006381333932");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => validateCodes(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.convertIsbn} onChange={(e) => setOptions((o) => ({ ...o, convertIsbn: e.target.checked }))} />
          Show conversions
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Codes (one per line, hyphens allowed)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="978-0-306-40615-7"
                aria-label="Codes (one per line, hyphens allowed)"
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
