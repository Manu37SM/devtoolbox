"use client";

import { useEffect, useRef, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";

import { generateHtpasswdAsync } from "./transform";
import type { TransformResult } from "@/lib/tool-transform";
import type { HtpasswdGeneratorOptions } from "./schema";

type Options = HtpasswdGeneratorOptions;

const defaultOptions: Options = { algorithm: "bcrypt", bcryptCost: 10 };

export function HtpasswdGeneratorToolView() {
  const [input, setInput] = useState("alice:change-me-now\nbob:another-password");
  const [options, setOptions] = useState<Options>(defaultOptions);
  const [nonce, setNonce] = useState(0);

  const [result, setResult] = useState<TransformResult>({ output: "", error: null });
  const requestId = useRef(0);
  useEffect(() => {
    const id = ++requestId.current;
    void generateHtpasswdAsync(input, options).then((r) => {
      if (id === requestId.current) setResult(r);
    });
  }, [input, options, nonce]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Algorithm
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.algorithm}
            onChange={(e) => setOptions((o) => ({ ...o, algorithm: e.target.value as Options["algorithm"] }))}
          >
            <option value="bcrypt">{"bcrypt (htpasswd -B, recommended)"}</option>
            <option value="apr1">{"APR1-MD5 (htpasswd -m)"}</option>
            <option value="sha1">{"SHA1 (weak, legacy)"}</option>
          </select>
        </label>
        {options.algorithm === "bcrypt" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Cost
          <input
            type="number"
            min={4}
            max={17}
            value={options.bcryptCost}
            onChange={(e) => setOptions((o) => ({ ...o, bcryptCost: Math.min(17, Math.max(4, Number(e.target.value) || 0)) }))}
            className="w-14 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        )}
        <Button variant="ghost" size="sm" onClick={() => setNonce((n) => n + 1)}>
          Regenerate
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">user:password per line</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="alice:s3cret"
                aria-label="user:password per line"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane label="htpasswd file" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
