"use client";

import { useEffect, useRef, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runJwksInspector } from "./transform";
import type { JwksInspectorOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

type Options = JwksInspectorOptions;

const defaultOptions: Options = {"output":"summary"} as Options;

export function JwksInspectorToolView() {
  const [input, setInput] = useState("{\n  \"keys\": [\n    { \"kty\": \"EC\", \"crv\": \"P-256\", \"kid\": \"sig-2024\", \"use\": \"sig\", \"alg\": \"ES256\", \"x\": \"TylDN3CN9uO5dWtB_D85MtYVk6S_Ad5pPugwLwZVbqo\", \"y\": \"hHyUsmPJpfC7b6YW8lH3gzlp1KO1JcQoEHHcOS0rfUw\" }\n  ]\n}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const [result, setResult] = useState<TransformResult>({ output: "", error: null });
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    void runJwksInspector(input, options).then((next) => {
      if (id === requestId.current) setResult(next);
    });
  }, [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.output}
            onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}
          >
            <option value="summary">{"Inspect"}</option>
            <option value="pem">{"Convert to PEM"}</option>
            <option value="jwks">{"Public JWKS (strip private)"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">JWKS, JWK or PEM public key</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"{\"keys\": [...]}"}
                aria-label="JWKS, JWK or PEM public key"
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
