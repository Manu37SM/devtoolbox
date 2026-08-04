"use client";

import { useState } from "react";
import type { IpLookupResult } from "@devtoolbox/shared";
import { Button } from "@/components/ui/button";
import { ApiClientError } from "@/lib/api-client";
import { lookupIp } from "./transform";

const ROWS: { label: string; key: keyof IpLookupResult }[] = [
  { label: "IP address", key: "ip" },
  { label: "City", key: "city" },
  { label: "Region", key: "region" },
  { label: "Country", key: "country" },
  { label: "Organization", key: "org" },
  { label: "Timezone", key: "timezone" },
];

export function IpLookupToolView() {
  const [ip, setIp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IpLookupResult | null>(null);

  async function handleLookup() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await lookupIp({ ip: ip.trim() || undefined });
      setResult(response);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong looking up this IP.");
    } finally {
      setLoading(false);
    }
  }

  const rows = result ? ROWS.filter((row) => Boolean(result[row.key])) : [];

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-md border border-border-default bg-bg-raised px-3 py-2 text-xs text-text-muted">
        This tool sends your input to our server to fetch the result — see why in &ldquo;How it works&rdquo;
        below.
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={ip}
          onChange={(e) => setIp(e.target.value)}
          placeholder="Leave blank to look up your own IP"
          aria-label="IP address"
          className="flex-1 rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm outline-none focus-visible:border-accent"
        />
        <Button onClick={handleLookup} disabled={loading}>
          {loading ? "Looking up…" : "Look up"}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : result ? (
          <div className="rounded-md border border-border-default">
            <div className="divide-y divide-border-default">
              {rows.map((row) => (
                <div key={row.key} className="grid grid-cols-[minmax(120px,1fr)_2fr] gap-2 px-3 py-1.5 text-sm">
                  <span className="text-text-secondary">{row.label}</span>
                  <span className="font-mono text-text-primary">{String(result[row.key])}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Click Look up to see IP details.</p>
        )}
      </div>
    </div>
  );
}
