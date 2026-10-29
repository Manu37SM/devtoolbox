"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";

import { generateHtpasswd } from "./transform";
import type { HtpasswdGeneratorOptions } from "./schema";

type Options = HtpasswdGeneratorOptions;

const defaultOptions: Options = {"algorithm":"apr1"} as Options;

export function HtpasswdGeneratorToolView() {
  const [input, setInput] = useState("alice:change-me-now\nbob:another-password");
  const [options, setOptions] = useState<Options>(defaultOptions);
  const [nonce, setNonce] = useState(0);

  const result = useMemo(() => generateHtpasswd(input, options, nonce), [input, options, nonce]);

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
            <option value="apr1">{"APR1-MD5 (htpasswd -m)"}</option>
            <option value="sha1">{"SHA1 (weak, legacy)"}</option>
          </select>
        </label>
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
