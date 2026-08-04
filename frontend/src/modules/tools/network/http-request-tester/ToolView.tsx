"use client";

import { useState } from "react";
import type { HttpRequestProxyResult } from "@devtoolbox/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { ApiClientError } from "@/lib/api-client";
import { sendHttpRequest } from "./transform";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
type Method = (typeof METHODS)[number];

interface HeaderRow {
  key: string;
  value: string;
}

function statusColorClass(status: number): string {
  if (status >= 200 && status < 300) return "text-success";
  if (status >= 400) return "text-danger";
  return "text-text-primary";
}

export function HttpRequestTesterToolView() {
  const [method, setMethod] = useState<Method>("GET");
  const [url, setUrl] = useState("");
  const [headerRows, setHeaderRows] = useState<HeaderRow[]>([{ key: "", value: "" }]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HttpRequestProxyResult | null>(null);

  const bodyDisabled = method === "GET" || method === "HEAD";

  function updateHeaderRow(index: number, patch: Partial<HeaderRow>) {
    setHeaderRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addHeaderRow() {
    setHeaderRows((rows) => [...rows, { key: "", value: "" }]);
  }

  function removeHeaderRow(index: number) {
    setHeaderRows((rows) => rows.filter((_, i) => i !== index));
  }

  async function handleSend() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const headers: Record<string, string> = {};
      for (const row of headerRows) {
        if (row.key.trim()) headers[row.key.trim()] = row.value;
      }
      const response = await sendHttpRequest({
        method,
        url,
        headers,
        body: bodyDisabled ? undefined : body || undefined,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong sending the request.");
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
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as Method)}
          aria-label="HTTP method"
          className="rounded-sm border border-border-default bg-bg-raised px-2 py-2 text-sm outline-none focus-visible:border-accent"
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/resource"
          aria-label="Request URL"
          className="flex-1 rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm outline-none focus-visible:border-accent"
        />
        <Button onClick={handleSend} disabled={loading || !url.trim()}>
          {loading ? "Sending…" : "Send"}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-text-secondary">Headers</span>
          <Button variant="ghost" size="sm" onClick={addHeaderRow}>
            Add header
          </Button>
        </div>
        <div className="flex flex-col gap-1.5">
          {headerRows.map((row, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                type="text"
                value={row.key}
                onChange={(e) => updateHeaderRow(i, { key: e.target.value })}
                placeholder="Header name"
                aria-label={`Header ${i + 1} name`}
                className="flex-1 rounded-sm border border-border-default bg-bg-raised px-2 py-1.5 font-mono text-xs outline-none focus-visible:border-accent"
              />
              <input
                type="text"
                value={row.value}
                onChange={(e) => updateHeaderRow(i, { value: e.target.value })}
                placeholder="Header value"
                aria-label={`Header ${i + 1} value`}
                className="flex-1 rounded-sm border border-border-default bg-bg-raised px-2 py-1.5 font-mono text-xs outline-none focus-visible:border-accent"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeHeaderRow(i)}
                aria-label={`Remove header ${i + 1}`}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      </div>

      {!bodyDisabled && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary" htmlFor="http-body">
            Body
          </label>
          <Textarea
            id="http-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder='{"key": "value"}'
            className="h-28"
          />
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : result ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 text-sm">
              <span className={`font-mono font-semibold ${statusColorClass(result.status)}`}>
                {result.status} {result.statusText}
              </span>
              <span className="text-text-muted">{result.durationMs} ms</span>
            </div>
            {result.bodyTruncated && (
              <p className="text-xs text-warning">Response body was truncated at 2MB.</p>
            )}
            <div>
              <h3 className="mb-2 text-sm font-medium text-text-secondary">Response headers</h3>
              <div className="rounded-md border border-border-default">
                <div className="divide-y divide-border-default">
                  {Object.entries(result.headers).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[minmax(120px,1fr)_2fr] gap-2 px-3 py-1.5 text-sm">
                      <span className="break-all font-mono text-text-secondary">{key}</span>
                      <span className="break-all font-mono text-text-primary">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="h-64">
              <OutputPane label="Response body" value={result.body} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Configure a request above and click Send.</p>
        )}
      </div>
    </div>
  );
}
