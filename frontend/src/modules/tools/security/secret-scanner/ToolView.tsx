"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runSecretScanner } from "./transform";
import type { SecretScannerOptions } from "./schema";

type Options = SecretScannerOptions;

const defaultOptions: Options = {"includeGeneric":true,"revealValues":false} as Options;

export function SecretScannerToolView() {
  const [input, setInput] = useState("aws_access_key_id = AKIAIOSFODNN7EXAMPLE\npassword = \"Tr0ub4dor&3xx\"\nDATABASE_URL=postgres://admin:hunter22xyz@db.internal:5432/app");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runSecretScanner(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.includeGeneric} onChange={(e) => setOptions((o) => ({ ...o, includeGeneric: e.target.checked }))} />
          Include generic password= patterns
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.revealValues} onChange={(e) => setOptions((o) => ({ ...o, revealValues: e.target.checked }))} />
          Reveal full values
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Text to scan</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste a config file, log or diff..."
                aria-label="Text to scan"
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
