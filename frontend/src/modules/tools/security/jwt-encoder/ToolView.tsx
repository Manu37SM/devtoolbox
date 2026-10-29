"use client";

import { useEffect, useRef, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import type { TransformResult } from "@/lib/tool-transform";
import { encodeJwt } from "./transform";
import type { JwtEncoderOptions } from "./schema";

type Options = JwtEncoderOptions;

const defaultOptions: Options = {"algorithm":"HS256","secret":"your-256-bit-secret","keyId":"","addIssuedAt":false,"expiresIn":"none"} as Options;

export function JwtEncoderToolView() {
  const [input, setInput] = useState("{\n  \"sub\": \"1234567890\",\n  \"name\": \"John Doe\"\n}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const [result, setResult] = useState<TransformResult>({ output: "", error: null });
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    encodeJwt(input, options).then((r) => {
      if (id === requestId.current) setResult(r);
    });
  }, [input, options]);

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
            <option value="HS256">{"HS256"}</option>
            <option value="HS384">{"HS384"}</option>
            <option value="HS512">{"HS512"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Secret
          <input
            type="text"
            value={options.secret}
            placeholder=""
            onChange={(e) => setOptions((o) => ({ ...o, secret: e.target.value }))}
            className="w-64 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          kid (optional)
          <input
            type="text"
            value={options.keyId}
            placeholder=""
            onChange={(e) => setOptions((o) => ({ ...o, keyId: e.target.value }))}
            className="w-36 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.addIssuedAt} onChange={(e) => setOptions((o) => ({ ...o, addIssuedAt: e.target.checked }))} />
          Add iat
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Expires
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.expiresIn}
            onChange={(e) => setOptions((o) => ({ ...o, expiresIn: e.target.value as Options["expiresIn"] }))}
          >
            <option value="none">{"Never"}</option>
            <option value="15m">{"15 minutes"}</option>
            <option value="1h">{"1 hour"}</option>
            <option value="24h">{"24 hours"}</option>
            <option value="7d">{"7 days"}</option>
            <option value="30d">{"30 days"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Payload (JSON)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder=""
                aria-label="Payload (JSON)"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane label="Signed token" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
