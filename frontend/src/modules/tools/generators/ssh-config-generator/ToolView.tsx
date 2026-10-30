"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { generateSshConfig } from "./transform";
import type { SshConfigGeneratorOptions } from "./schema";

type Options = SshConfigGeneratorOptions;

const defaultOptions: Options = {"defaultUser": "", "defaultKey": "", "identitiesOnly": true, "addKeysToAgent": false, "useKeychain": false, "forwardAgent": false, "keepAlive": 60, "compression": false, "multiplexing": false, "hostKeyChecking": "default", "globalBlock": true, "comments": true} as Options;

export function SshConfigGeneratorToolView() {
  const [in0, setIn0] = useState("bastion deploy@bastion.example.com:2222 key=~/.ssh/bastion_ed25519\ndb1 admin@10.0.1.5 jump=bastion key=~/.ssh/db_ed25519 L=5433:localhost:5432\nstaging-* deploy@10.0.2.7 agent=yes timeout=5");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateSshConfig(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Default user"}
          <input type="text" value={options.defaultUser} placeholder={"deploy"} onChange={(e) => setOptions((o) => ({ ...o, defaultUser: e.target.value }))} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Default key"}
          <input type="text" value={options.defaultKey} placeholder={"~/.ssh/id_ed25519"} onChange={(e) => setOptions((o) => ({ ...o, defaultKey: e.target.value }))} className="w-44 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.identitiesOnly} onChange={(e) => setOptions((o) => ({ ...o, identitiesOnly: e.target.checked }))} />
          {"IdentitiesOnly"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.addKeysToAgent} onChange={(e) => setOptions((o) => ({ ...o, addKeysToAgent: e.target.checked }))} />
          {"AddKeysToAgent"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.useKeychain} onChange={(e) => setOptions((o) => ({ ...o, useKeychain: e.target.checked }))} />
          {"macOS keychain"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.forwardAgent} onChange={(e) => setOptions((o) => ({ ...o, forwardAgent: e.target.checked }))} />
          {"ForwardAgent"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Keep-alive (s)"}
          <input type="number" min={0} max={3600} value={options.keepAlive} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, keepAlive: Math.min(3600, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.compression} onChange={(e) => setOptions((o) => ({ ...o, compression: e.target.checked }))} />
          {"Compression"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.multiplexing} onChange={(e) => setOptions((o) => ({ ...o, multiplexing: e.target.checked }))} />
          {"Multiplexing"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Host key check"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.hostKeyChecking} onChange={(e) => setOptions((o) => ({ ...o, hostKeyChecking: e.target.value as Options["hostKeyChecking"] }))}>
            <option value={"default"}>{"Default"}</option>
            <option value={"yes"}>{"yes"}</option>
            <option value={"accept-new"}>{"accept-new"}</option>
            <option value={"no"}>{"no (unsafe)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.globalBlock} onChange={(e) => setOptions((o) => ({ ...o, globalBlock: e.target.checked }))} />
          {"Host * block"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.comments} onChange={(e) => setOptions((o) => ({ ...o, comments: e.target.checked }))} />
          {"Comments"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Hosts (alias [user@]host[:port] key=\u2026 jump=\u2026 L=\u2026)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"web1 deploy@10.0.0.5 key=~/.ssh/web"}
                  aria-label={"Hosts (alias [user@]host[:port] key=\u2026 jump=\u2026 L=\u2026)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"~/.ssh/config"} fileName={"config"} value={result.output} error={result.error?.message ?? null} placeholder={"Config will appear here"} />}
        />
      </div>
    </div>
  );
}
