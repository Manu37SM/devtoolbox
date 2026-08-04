"use client";

import { useMemo, useState } from "react";
import { parseUrl } from "./transform";
import type { UrlParserOptions } from "./schema";

const ROWS: { label: string; key: "protocol" | "username" | "password" | "hostname" | "port" | "origin" | "pathname" | "search" | "hash" }[] = [
  { label: "Protocol", key: "protocol" },
  { label: "Username", key: "username" },
  { label: "Password", key: "password" },
  { label: "Hostname", key: "hostname" },
  { label: "Port", key: "port" },
  { label: "Origin", key: "origin" },
  { label: "Pathname", key: "pathname" },
  { label: "Search", key: "search" },
  { label: "Hash", key: "hash" },
];

export function UrlParserToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<UrlParserOptions>({ decodeComponents: true });

  const result = useMemo(() => parseUrl(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary" htmlFor="url-input">
          URL
        </label>
        <input
          id="url-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="https://user:pass@example.com:8080/path?a=1#section"
          aria-label="URL to parse"
          className="w-full rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm outline-none focus-visible:border-accent"
        />
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.decodeComponents}
            onChange={(e) => setOptions((o) => ({ ...o, decodeComponents: e.target.checked }))}
          />
          Decode percent-escapes in path/hash
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {result.error ? (
          <p role="alert" className="text-sm text-danger">
            {result.error}
          </p>
        ) : input.trim().length === 0 ? (
          <p className="text-sm text-text-muted">Paste a URL above to see its breakdown.</p>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="rounded-md border border-border-default">
              <div className="divide-y divide-border-default">
                {ROWS.map((row) => (
                  <div key={row.key} className="grid grid-cols-[minmax(120px,1fr)_2fr] gap-2 px-3 py-1.5 text-sm">
                    <span className="text-text-secondary">{row.label}</span>
                    <span className="break-all font-mono text-text-primary">{result[row.key] || "—"}</span>
                  </div>
                ))}
              </div>
            </div>

            {result.queryParams.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-text-secondary">
                  Query parameters ({result.queryParams.length})
                </h3>
                <div className="rounded-md border border-border-default">
                  <div className="divide-y divide-border-default">
                    {result.queryParams.map((param, i) => (
                      <div
                        key={`${param.key}-${i}`}
                        className="grid grid-cols-[minmax(120px,1fr)_2fr] gap-2 px-3 py-1.5 text-sm"
                      >
                        <span className="break-all font-mono text-text-secondary">{param.key}</span>
                        <span className="break-all font-mono text-text-primary">{param.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
