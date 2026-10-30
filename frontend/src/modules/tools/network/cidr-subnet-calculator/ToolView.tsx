"use client";

import { useMemo, useState } from "react";
import { calculateCidrSubnet, MAX_SPLIT } from "./transform";
import type { CidrSubnetCalculatorOptions } from "./schema";
import { CopyValue, ResultActions, toLines } from "@/components/tools/ResultActions";

const ROWS: { label: string; key: "networkAddress" | "broadcastAddress" | "subnetMask" | "wildcardMask" | "firstHost" | "lastHost" | "totalHosts" | "usableHosts" | "prefixLength" }[] = [
  { label: "Network Address", key: "networkAddress" },
  { label: "Broadcast Address", key: "broadcastAddress" },
  { label: "Subnet Mask", key: "subnetMask" },
  { label: "Wildcard Mask", key: "wildcardMask" },
  { label: "First Usable Host", key: "firstHost" },
  { label: "Last Usable Host", key: "lastHost" },
  { label: "Prefix Length", key: "prefixLength" },
  { label: "Total Hosts", key: "totalHosts" },
  { label: "Usable Hosts", key: "usableHosts" },
];

export function CidrSubnetCalculatorToolView() {
  const [cidr, setCidr] = useState("192.168.1.0/24");
  const [options, setOptions] = useState<Omit<CidrSubnetCalculatorOptions, "cidr">>({
    platform: "standard",
    splitPrefix: 0,
    showBinary: false,
  });
  const result = useMemo(() => calculateCidrSubnet(cidr, options), [cidr, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary" htmlFor="cidr-input">
          CIDR block
        </label>
        <input
          id="cidr-input"
          type="text"
          value={cidr}
          onChange={(e) => setCidr(e.target.value)}
          placeholder="192.168.1.0/24 or 192.168.1.0 255.255.255.0"
          aria-label="CIDR block"
          className="w-full rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm outline-none focus-visible:border-accent"
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Reserved addresses
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.platform}
            onChange={(e) => setOptions((o) => ({ ...o, platform: e.target.value as CidrSubnetCalculatorOptions["platform"] }))}
          >
            <option value="standard">Standard (network + broadcast)</option>
            <option value="aws">AWS VPC</option>
            <option value="azure">Azure VNet</option>
            <option value="gcp">Google Cloud VPC</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Split into
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.splitPrefix}
            onChange={(e) => setOptions((o) => ({ ...o, splitPrefix: Number(e.target.value) }))}
          >
            <option value={0}>Don&apos;t split</option>
            {Array.from({ length: 32 - (result.error ? 0 : result.prefixLength) }, (_, i) => (result.error ? 0 : result.prefixLength) + i + 1).map((p) => (
              <option key={p} value={p}>
                /{p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.showBinary}
            onChange={(e) => setOptions((o) => ({ ...o, showBinary: e.target.checked }))}
          />
          Show binary
        </label>
      </div>
      {!result.error && (
        <ResultActions
          text={toLines(ROWS.map((row) => [row.label, String(result[row.key])]))}
          json={Object.fromEntries(ROWS.map((row) => [row.key, result[row.key]]))}
        />
      )}
      <div className="min-h-0 flex-1 overflow-auto">
        {result.error ? (
          <p role="alert" className="text-sm text-danger">
            {result.error}
          </p>
        ) : (
          <div className="rounded-md border border-border-default">
            <div className="divide-y divide-border-default">
              {ROWS.map((row) => (
                <div key={row.key} className="grid grid-cols-[minmax(160px,1fr)_2fr] gap-2 px-3 py-1.5 text-sm">
                  <span className="text-text-secondary">{row.label}</span>
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-mono text-text-primary">{result[row.key]}</span>
                    <CopyValue value={String(result[row.key] ?? "")} label={row.label} />
                  </span>
                </div>
              ))}
              {result.binary &&
                (["address", "mask", "network"] as const).map((k) => (
                  <div key={k} className="grid grid-cols-[minmax(160px,1fr)_2fr] gap-2 px-3 py-1.5 text-sm">
                    <span className="text-text-secondary">Binary {k}</span>
                    <span className="font-mono text-text-primary">{result.binary![k]}</span>
                  </div>
                ))}
            </div>
            {result.platformNote && <p className="px-3 py-2 text-xs text-text-muted">{result.platformNote}</p>}
          </div>
        )}
        {!result.error && result.subnets && (
          <div className="mt-3 rounded-md border border-border-default">
            <div className="flex items-center justify-between px-3 py-2 text-sm text-text-secondary">
              <span>
                {result.subnetCount!.toLocaleString("en-US")} subnets of /{options.splitPrefix}
                {result.subnetCount! > MAX_SPLIT ? ` (first ${MAX_SPLIT} shown)` : ""}
              </span>
              <ResultActions
                text={result.subnets.map((s) => `${s.cidr}\t${s.first} - ${s.last}\t${s.usable}`).join("\n")}
                json={result.subnets}
              />
            </div>
            <table className="w-full text-left font-mono text-sm">
              <thead className="text-xs text-text-muted">
                <tr>
                  <th className="px-3 py-1 font-normal">Subnet</th>
                  <th className="px-3 py-1 font-normal">Usable range</th>
                  <th className="px-3 py-1 text-right font-normal">Usable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {result.subnets.map((s) => (
                  <tr key={s.cidr}>
                    <td className="px-3 py-1">{s.cidr}</td>
                    <td className="px-3 py-1">{s.usable > 0 ? `${s.first} – ${s.last}` : "—"}</td>
                    <td className="px-3 py-1 text-right">{s.usable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
