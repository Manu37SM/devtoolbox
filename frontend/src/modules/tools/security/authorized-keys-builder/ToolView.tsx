"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { authorizedKeysBuilder } from "./transform";
import type { AuthorizedKeysBuilderOptions } from "./schema";

type Options = AuthorizedKeysBuilderOptions;

const defaultOptions: Options = {"restrict": false, "noPortForwarding": false, "noAgentForwarding": false, "noX11Forwarding": false, "noPty": false, "noUserRc": false, "from": "", "command": "", "expiry": "", "permitOpen": "", "keepExisting": false, "fingerprints": true, "defaultComment": "", "dedupe": true} as Options;

export function AuthorizedKeysBuilderToolView() {
  const [in0, setIn0] = useState("ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl dev@laptop");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => authorizedKeysBuilder(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"from= (hosts/CIDR)"}
          <input type="text" value={options.from} placeholder={"203.0.113.0/24, *.corp.example.com"} onChange={(e) => setOptions((o) => ({ ...o, from: e.target.value }))} className="w-64 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Forced command"}
          <input type="text" value={options.command} placeholder={"/usr/local/bin/backup.sh"} onChange={(e) => setOptions((o) => ({ ...o, command: e.target.value }))} className="w-64 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"permitopen"}
          <input type="text" value={options.permitOpen} placeholder={"db.internal:5432"} onChange={(e) => setOptions((o) => ({ ...o, permitOpen: e.target.value }))} className="w-48 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Expires"}
          <input type="text" value={options.expiry} placeholder={"20271231"} onChange={(e) => setOptions((o) => ({ ...o, expiry: e.target.value }))} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Comment if missing"}
          <input type="text" value={options.defaultComment} placeholder={"deploy"} onChange={(e) => setOptions((o) => ({ ...o, defaultComment: e.target.value }))} className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.restrict} onChange={(e) => setOptions((o) => ({ ...o, restrict: e.target.checked }))} />
          {"restrict (all off)"}
        </label>
        {["false"].includes(String(options.restrict)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.noPortForwarding} onChange={(e) => setOptions((o) => ({ ...o, noPortForwarding: e.target.checked }))} />
          {"no-port-forwarding"}
        </label>
        )}
        {["false"].includes(String(options.restrict)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.noAgentForwarding} onChange={(e) => setOptions((o) => ({ ...o, noAgentForwarding: e.target.checked }))} />
          {"no-agent-forwarding"}
        </label>
        )}
        {["false"].includes(String(options.restrict)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.noX11Forwarding} onChange={(e) => setOptions((o) => ({ ...o, noX11Forwarding: e.target.checked }))} />
          {"no-X11-forwarding"}
        </label>
        )}
        {["false"].includes(String(options.restrict)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.noPty} onChange={(e) => setOptions((o) => ({ ...o, noPty: e.target.checked }))} />
          {"no-pty"}
        </label>
        )}
        {["false"].includes(String(options.restrict)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.noUserRc} onChange={(e) => setOptions((o) => ({ ...o, noUserRc: e.target.checked }))} />
          {"no-user-rc"}
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.keepExisting} onChange={(e) => setOptions((o) => ({ ...o, keepExisting: e.target.checked }))} />
          {"Keep options already on lines"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.dedupe} onChange={(e) => setOptions((o) => ({ ...o, dedupe: e.target.checked }))} />
          {"Remove duplicate keys"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.fingerprints} onChange={(e) => setOptions((o) => ({ ...o, fingerprints: e.target.checked }))} />
          {"Fingerprint comments"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Public keys (one per line)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"ssh-ed25519 AAAA\u2026 user@host"}
                  aria-label={"Public keys (one per line)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"authorized_keys"} fileName={"authorized_keys"} value={result.output} error={result.error?.message ?? null} placeholder={"Paste one or more public keys"} />}
        />
      </div>
    </div>
  );
}
