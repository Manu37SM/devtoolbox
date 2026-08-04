"use client";

import { useState } from "react";
import type { DnsLookupDto, DnsLookupResult } from "@devtoolbox/shared";
import { Button } from "@/components/ui/button";
import { ApiClientError } from "@/lib/api-client";
import { lookupDns } from "./transform";

const RECORD_TYPES: DnsLookupDto["recordType"][] = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SOA"];

export function DnsLookupToolView() {
  const [domain, setDomain] = useState("");
  const [recordType, setRecordType] = useState<DnsLookupDto["recordType"]>("A");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DnsLookupResult | null>(null);

  async function handleLookup() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await lookupDns({ domain, recordType });
      setResult(response);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong looking up this domain.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="rounded-md border border-border-default bg-bg-raised px-3 py-2 text-xs text-text-muted">
        This tool sends your input to our server to fetch the result — see why in &ldquo;How it works&rdquo;
        below.
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          aria-label="Domain"
          className="flex-1 rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm outline-none focus-visible:border-accent"
        />
        <select
          value={recordType}
          onChange={(e) => setRecordType(e.target.value as DnsLookupDto["recordType"])}
          aria-label="Record type"
          className="rounded-sm border border-border-default bg-bg-raised px-2 py-2 text-sm outline-none focus-visible:border-accent"
        >
          {RECORD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <Button onClick={handleLookup} disabled={loading || !domain.trim()}>
          {loading ? "Looking up…" : "Look up"}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : result ? (
          result.records.length === 0 ? (
            <p className="text-sm text-text-muted">No records found.</p>
          ) : (
            <div className="rounded-md border border-border-default">
              <div className="divide-y divide-border-default">
                {result.records.map((record, i) => (
                  <div key={i} className="break-all px-3 py-1.5 font-mono text-sm text-text-primary">
                    {record}
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <p className="text-sm text-text-muted">Enter a domain and record type, then click Look up.</p>
        )}
      </div>
    </div>
  );
}
