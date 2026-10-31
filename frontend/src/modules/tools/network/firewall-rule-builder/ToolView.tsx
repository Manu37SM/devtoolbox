"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { firewallRuleBuilder } from "./transform";
import type { FirewallRuleBuilderOptions } from "./schema";

type Options = FirewallRuleBuilderOptions;

const defaultOptions: Options = {"backend": "ufw", "defaultIn": "drop", "defaultOut": "accept", "allowLoopback": true, "allowEstablished": true, "dropInvalid": true, "allowPing": true, "ipv6": true, "logDropped": false, "flush": true, "format": "file", "sshPort": 22, "comments": true} as Options;

export function FirewallRuleBuilderToolView() {
  const [in0, setIn0] = useState("allow ssh\nallow web");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => firewallRuleBuilder(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Firewall"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.backend} onChange={(e) => setOptions((o) => ({ ...o, backend: e.target.value as Options["backend"] }))}>
            <option value={"ufw"}>{"ufw"}</option>
            <option value={"iptables"}>{"iptables"}</option>
            <option value={"nftables"}>{"nftables"}</option>
            <option value={"firewalld"}>{"firewalld"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Incoming by default"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.defaultIn} onChange={(e) => setOptions((o) => ({ ...o, defaultIn: e.target.value as Options["defaultIn"] }))}>
            <option value={"drop"}>{"Drop"}</option>
            <option value={"reject"}>{"Reject"}</option>
            <option value={"accept"}>{"Accept"}</option>
          </select>
        </label>
        {["ufw", "iptables", "nftables"].includes(String(options.backend)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Outgoing by default"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.defaultOut} onChange={(e) => setOptions((o) => ({ ...o, defaultOut: e.target.value as Options["defaultOut"] }))}>
            <option value={"accept"}>{"Accept"}</option>
            <option value={"drop"}>{"Drop"}</option>
          </select>
        </label>
        )}
        {["iptables", "nftables"].includes(String(options.backend)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Output"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.format} onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}>
            <option value={"file"}>{"Ruleset file"}</option>
            <option value={"commands"}>{"Commands"}</option>
          </select>
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"SSH port"}
          <input type="number" min={1} max={65535} value={options.sshPort} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, sshPort: Math.min(65535, Math.max(1, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.allowEstablished} onChange={(e) => setOptions((o) => ({ ...o, allowEstablished: e.target.checked }))} />
          {"Allow established"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.allowLoopback} onChange={(e) => setOptions((o) => ({ ...o, allowLoopback: e.target.checked }))} />
          {"Allow loopback"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.dropInvalid} onChange={(e) => setOptions((o) => ({ ...o, dropInvalid: e.target.checked }))} />
          {"Drop invalid"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.allowPing} onChange={(e) => setOptions((o) => ({ ...o, allowPing: e.target.checked }))} />
          {"Allow ping"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.ipv6} onChange={(e) => setOptions((o) => ({ ...o, ipv6: e.target.checked }))} />
          {"IPv6"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.logDropped} onChange={(e) => setOptions((o) => ({ ...o, logDropped: e.target.checked }))} />
          {"Log drops"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.flush} onChange={(e) => setOptions((o) => ({ ...o, flush: e.target.checked }))} />
          {"Flush first"}
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
                <label className="text-sm font-medium text-text-secondary">{"Rules (one per line)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"allow ssh from 10.0.0.0/8 comment office\nallow web\nallow tcp 5432 from 192.168.1.0/24\ndeny udp 161\nlimit tcp 2222"}
                  aria-label={"Rules (one per line)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Firewall config"} fileName={"firewall.sh"} value={result.output} error={result.error?.message ?? null} placeholder={"Add rules such as: allow ssh"} />}
        />
      </div>
    </div>
  );
}
