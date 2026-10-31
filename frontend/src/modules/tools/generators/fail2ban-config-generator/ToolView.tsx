"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { fail2banConfigGenerator } from "./transform";
import type { Fail2banConfigGeneratorOptions } from "./schema";

type Options = Fail2banConfigGeneratorOptions;

const defaultOptions: Options = {"preset": "sshd", "jailName": "myapp", "port": "", "logpath": "", "maxretry": 5, "findtime": "10m", "bantime": "1h", "ignoreip": "127.0.0.1/8 ::1", "banaction": "default", "backend": "auto", "sshdMode": "normal", "increment": false, "incrementFactor": 2, "maxBantime": "5w", "destemail": "", "report": "mw"} as Options;

export function Fail2banConfigGeneratorToolView() {
  const [in0, setIn0] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => fail2banConfigGenerator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Service"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.preset} onChange={(e) => setOptions((o) => ({ ...o, preset: e.target.value as Options["preset"] }))}>
            <option value={"sshd"}>{"SSH (sshd)"}</option>
            <option value={"nginx-http-auth"}>{"nginx basic auth"}</option>
            <option value={"nginx-botsearch"}>{"nginx bot search"}</option>
            <option value={"nginx-limit-req"}>{"nginx limit_req"}</option>
            <option value={"apache-auth"}>{"Apache auth"}</option>
            <option value={"apache-badbots"}>{"Apache bad bots"}</option>
            <option value={"postfix"}>{"Postfix"}</option>
            <option value={"dovecot"}>{"Dovecot"}</option>
            <option value={"recidive"}>{"Repeat offenders (recidive)"}</option>
            <option value={"custom"}>{"Custom filter\u2026"}</option>
          </select>
        </label>
        {["custom"].includes(String(options.preset)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Jail name"}
          <input type="text" value={options.jailName} placeholder={"myapp"} onChange={(e) => setOptions((o) => ({ ...o, jailName: e.target.value }))} className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["sshd"].includes(String(options.preset)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"sshd mode"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.sshdMode} onChange={(e) => setOptions((o) => ({ ...o, sshdMode: e.target.value as Options["sshdMode"] }))}>
            <option value={"normal"}>{"normal"}</option>
            <option value={"ddos"}>{"ddos"}</option>
            <option value={"extra"}>{"extra"}</option>
            <option value={"aggressive"}>{"aggressive"}</option>
          </select>
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Log path"}
          <input type="text" value={options.logpath} placeholder={"preset default"} onChange={(e) => setOptions((o) => ({ ...o, logpath: e.target.value }))} className="w-56 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Ports"}
          <input type="text" value={options.port} placeholder={"preset default"} onChange={(e) => setOptions((o) => ({ ...o, port: e.target.value }))} className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Max retries"}
          <input type="number" min={1} max={1000} step={1} value={options.maxretry} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, maxretry: Math.min(1000, Math.max(1, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Find time"}
          <input type="text" value={options.findtime} placeholder={"10m"} onChange={(e) => setOptions((o) => ({ ...o, findtime: e.target.value }))} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Ban time (-1 = forever)"}
          <input type="text" value={options.bantime} placeholder={"1h"} onChange={(e) => setOptions((o) => ({ ...o, bantime: e.target.value }))} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Ignore IPs"}
          <input type="text" value={options.ignoreip} placeholder={"127.0.0.1/8 ::1"} onChange={(e) => setOptions((o) => ({ ...o, ignoreip: e.target.value }))} className="w-56 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Ban action"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.banaction} onChange={(e) => setOptions((o) => ({ ...o, banaction: e.target.value as Options["banaction"] }))}>
            <option value={"default"}>{"Distro default"}</option>
            <option value={"nftables-multiport"}>{"nftables"}</option>
            <option value={"iptables-multiport"}>{"iptables"}</option>
            <option value={"ufw"}>{"ufw"}</option>
            <option value={"firewallcmd-rich-rules"}>{"firewalld"}</option>
            <option value={"nftables-allports"}>{"nftables (all ports)"}</option>
            <option value={"iptables-allports"}>{"iptables (all ports)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Backend"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.backend} onChange={(e) => setOptions((o) => ({ ...o, backend: e.target.value as Options["backend"] }))}>
            <option value={"auto"}>{"auto"}</option>
            <option value={"polling"}>{"polling"}</option>
            <option value={"systemd"}>{"systemd journal"}</option>
            <option value={"pyinotify"}>{"pyinotify"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.increment} onChange={(e) => setOptions((o) => ({ ...o, increment: e.target.checked }))} />
          {"Escalating bans"}
        </label>
        {["true"].includes(String(options.increment)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Factor"}
          <input type="number" min={1} max={100} step={1} value={options.incrementFactor} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, incrementFactor: Math.min(100, Math.max(1, n)) })); }} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        {["true"].includes(String(options.increment)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Max ban"}
          <input type="text" value={options.maxBantime} placeholder={"5w"} onChange={(e) => setOptions((o) => ({ ...o, maxBantime: e.target.value }))} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Alert e-mail"}
          <input type="text" value={options.destemail} placeholder={"ops@example.com"} onChange={(e) => setOptions((o) => ({ ...o, destemail: e.target.value }))} className="w-48 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Report"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.report} onChange={(e) => setOptions((o) => ({ ...o, report: e.target.value as Options["report"] }))}>
            <option value={"mw"}>{"whois"}</option>
            <option value={"mwl"}>{"whois + log lines"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Custom filter: failregex lines (use <HOST> for the offender's IP; ignored for presets)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"^\\S+ myapp\\[\\d+\\]: login failed for \\S+ from <HOST>$"}
                  aria-label={"Custom filter: failregex lines (use <HOST> for the offender's IP; ignored for presets)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"fail2ban config"} fileName={"jail.local"} value={result.output} error={result.error?.message ?? null} placeholder={"Pick a service, or choose Custom and add failregex lines"} />}
        />
      </div>
    </div>
  );
}
