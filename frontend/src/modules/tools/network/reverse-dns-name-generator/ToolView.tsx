"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { reverseDnsNameGenerator } from "./transform";
import type { ReverseDnsNameGeneratorOptions } from "./schema";

type Options = ReverseDnsNameGeneratorOptions;

const defaultOptions: Options = {"bind": true, "hostname": "host.example.com.", "ttl": 3600, "classlessSeparator": "/", "trailingDot": true} as Options;

export function ReverseDnsNameGeneratorToolView() {
  const [in0, setIn0] = useState("192.0.2.5\n192.0.2.128/25\n2001:db8::/32");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => reverseDnsNameGenerator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {["true"].includes(String(options.bind)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"PTR target"}
          <input type="text" value={options.hostname} placeholder={"host.example.com."} onChange={(e) => setOptions((o) => ({ ...o, hostname: e.target.value }))} className="w-52 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["true"].includes(String(options.bind)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"TTL"}
          <input type="number" min={0} max={2147483647} step={60} value={options.ttl} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, ttl: Math.min(2147483647, Math.max(0, n)) })); }} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"RFC 2317 label"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.classlessSeparator} onChange={(e) => setOptions((o) => ({ ...o, classlessSeparator: e.target.value as Options["classlessSeparator"] }))}>
            <option value={"/"}>{"128/25"}</option>
            <option value={"-"}>{"128-25"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.bind} onChange={(e) => setOptions((o) => ({ ...o, bind: e.target.checked }))} />
          {"BIND records"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.trailingDot} onChange={(e) => setOptions((o) => ({ ...o, trailingDot: e.target.checked }))} />
          {"Trailing dot"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"IP addresses or CIDR blocks (one per line)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"192.0.2.5\n192.0.2.128/25\n2001:db8::/32"}
                  aria-label={"IP addresses or CIDR blocks (one per line)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Reverse DNS"} fileName={"reverse-dns.txt"} value={result.output} error={result.error?.message ?? null} placeholder={"Enter an IP address or CIDR block"} />}
        />
      </div>
    </div>
  );
}
