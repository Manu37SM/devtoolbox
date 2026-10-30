"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { decodeCsr } from "./transform";
import type { CsrDecoderOptions } from "./schema";

type Options = CsrDecoderOptions;

const defaultOptions: Options = {"dnStyle": "openssl", "output": "summary", "expectNames": "", "fingerprintStyle": "colon"} as Options;

export function CsrDecoderToolView() {
  const [in0, setIn0] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => decodeCsr(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Output"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.output} onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}>
            <option value={"summary"}>{"Summary"}</option>
            <option value={"json"}>{"JSON"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Subject style"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.dnStyle} onChange={(e) => setOptions((o) => ({ ...o, dnStyle: e.target.value as Options["dnStyle"] }))}>
            <option value={"openssl"}>{"OpenSSL (/C=\u2026/CN=\u2026)"}</option>
            <option value={"rfc2253"}>{"RFC 2253 (CN=\u2026,C=\u2026)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Fingerprints"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.fingerprintStyle} onChange={(e) => setOptions((o) => ({ ...o, fingerprintStyle: e.target.value as Options["fingerprintStyle"] }))}>
            <option value={"colon"}>{"AA:BB:CC"}</option>
            <option value={"hex"}>{"aabbcc"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Must cover"}
          <input type="text" value={options.expectNames} placeholder={"example.com, www.example.com"} onChange={(e) => setOptions((o) => ({ ...o, expectNames: e.target.value }))} className="w-56 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Certificate request (PEM)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"-----BEGIN CERTIFICATE REQUEST-----\n...\n-----END CERTIFICATE REQUEST-----"}
                  aria-label={"Certificate request (PEM)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Decoded request"} fileName={"csr-decoded.txt"} value={result.output} error={result.error?.message ?? null} placeholder={"Paste a CSR to decode it"} />}
        />
      </div>
    </div>
  );
}
