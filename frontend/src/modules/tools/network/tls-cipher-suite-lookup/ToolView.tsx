"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runTlsCipherSuiteLookup } from "./transform";
import type { TlsCipherSuiteLookupOptions } from "./schema";

type Options = TlsCipherSuiteLookupOptions;

const defaultOptions: Options = {"sort":"input"} as Options;

export function TlsCipherSuiteLookupToolView() {
  const [input, setInput] = useState("TLS_AES_256_GCM_SHA384\nECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-SHA384:AES128-SHA:DES-CBC3-SHA\n0xC0,0x2F\nRC4-MD5");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runTlsCipherSuiteLookup(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Order
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.sort}
            onChange={(e) => setOptions((o) => ({ ...o, sort: e.target.value as Options["sort"] }))}
          >
            <option value="input">{"As entered"}</option>
            <option value="rating">{"Worst first"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Cipher suites (names, OpenSSL string or hex codes)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ECDHE-RSA-AES128-GCM-SHA256"
                aria-label="Cipher suites (names, OpenSSL string or hex codes)"
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
