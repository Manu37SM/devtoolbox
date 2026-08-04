"use client";

import { useMemo, useState } from "react";
import { calculateCidrSubnet } from "./transform";

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
  const result = useMemo(() => calculateCidrSubnet(cidr), [cidr]);

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
          placeholder="192.168.1.0/24"
          aria-label="CIDR block"
          className="w-full rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm outline-none focus-visible:border-accent"
        />
      </div>
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
                  <span className="font-mono text-text-primary">{result[row.key]}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
