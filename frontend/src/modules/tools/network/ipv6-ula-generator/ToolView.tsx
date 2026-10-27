"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { generateUla } from "./transform";
import type { Ipv6UlaGeneratorOptions } from "./schema";

type Options = Ipv6UlaGeneratorOptions;

const defaultOptions: Options = {"count":1,"showSubnets":true} as Options;

export function Ipv6UlaGeneratorToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);
  const [nonce, setNonce] = useState(0);

  const result = useMemo(() => generateUla(input, options, nonce), [input, options, nonce]);
  void setInput;
  void input;
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Prefixes
          <input
            type="number"
            min={1} max={50}
            value={options.count}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, count: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showSubnets} onChange={(e) => setOptions((o) => ({ ...o, showSubnets: e.target.checked }))} />
          Show example /64 subnets
        </label>
        <Button variant="ghost" size="sm" onClick={() => setNonce((n) => n + 1)}>
          Regenerate
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <OutputPane label="ULA prefixes" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />
      </div>
    </div>
  );
}
