"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { transformSecret } from "./transform";
import type { KubernetesSecretEncoderOptions } from "./schema";

type Options = KubernetesSecretEncoderOptions;

const defaultOptions: Options = {"mode":"encode"} as Options;

export function KubernetesSecretEncoderToolView() {
  const [input, setInput] = useState("apiVersion: v1\nkind: Secret\nmetadata:\n  name: db-credentials\ntype: Opaque\nstringData:\n  username: admin\n  password: s3cr3t-value\n");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => transformSecret(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Mode
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.mode}
            onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}
          >
            <option value="encode">{"Encode (stringData → data)"}</option>
            <option value="decode">{"Decode (data → stringData)"}</option>
            <option value="from-env">{".env → Secret"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Secret YAML or .env</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"apiVersion: v1\nkind: Secret\n..."}
                aria-label="Secret YAML or .env"
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
