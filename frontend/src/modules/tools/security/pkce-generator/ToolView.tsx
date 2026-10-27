"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";


import { generatePkce } from "./transform";
import type { PkceGeneratorOptions } from "./schema";

type Options = PkceGeneratorOptions;

const defaultOptions: Options = {"length":64} as Options;

export function PkceGeneratorToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);
  const [nonce, setNonce] = useState(0);

  const result = useMemo(() => generatePkce(input, options, nonce), [input, options, nonce]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Verifier length
          <input
            type="number"
            min={43} max={128}
            value={options.length}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, length: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <Button variant="ghost" size="sm" onClick={() => setNonce((n) => n + 1)}>
          Regenerate
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Existing code_verifier (optional)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Leave empty to generate a new one"
                aria-label="Existing code_verifier (optional)"
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
