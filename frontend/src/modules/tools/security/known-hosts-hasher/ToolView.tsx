"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { knownHostsHasher } from "./transform";
import type { KnownHostsHasherOptions } from "./schema";

type Options = KnownHostsHasherOptions;

const defaultOptions: Options = {"action": "hash", "port": 22, "salt": "", "lowercase": true} as Options;

export function KnownHostsHasherToolView() {
  const [in0, setIn0] = useState("github.com,140.82.121.4 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => knownHostsHasher(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Action"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.action} onChange={(e) => setOptions((o) => ({ ...o, action: e.target.value as Options["action"] }))}>
            <option value={"hash"}>{"Hash host names"}</option>
            <option value={"match"}>{"Find a host in hashed entries"}</option>
          </select>
        </label>
        {["hash"].includes(String(options.action)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Port (non-22 \u2192 [host]:port)"}
          <input type="number" min={1} max={65535} step={1} value={options.port} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, port: Math.min(65535, Math.max(1, n)) })); }} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        {["hash"].includes(String(options.action)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Fixed salt (base64, optional)"}
          <input type="text" value={options.salt} placeholder={"empty = random per entry"} onChange={(e) => setOptions((o) => ({ ...o, salt: e.target.value }))} className="w-60 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["hash"].includes(String(options.action)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.lowercase} onChange={(e) => setOptions((o) => ({ ...o, lowercase: e.target.checked }))} />
          {"Lower-case host names"}
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Host names or known_hosts entries (match mode: first line is the host to find)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"github.com\n[git.example.com]:2222\nexample.org ssh-ed25519 AAAA\u2026"}
                  aria-label={"Host names or known_hosts entries (match mode: first line is the host to find)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"known_hosts"} fileName={"known_hosts"} value={result.output} error={result.error?.message ?? null} placeholder={"Enter host names or known_hosts lines"} />}
        />
      </div>
    </div>
  );
}
