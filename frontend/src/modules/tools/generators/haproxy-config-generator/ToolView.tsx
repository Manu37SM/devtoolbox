"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { haproxyConfigGenerator } from "./transform";
import type { HaproxyConfigGeneratorOptions } from "./schema";

type Options = HaproxyConfigGeneratorOptions;

const defaultOptions: Options = {"mode": "http", "balance": "roundrobin", "healthPath": "/", "tls": false, "certPath": "/etc/haproxy/certs/site.pem", "redirectHttps": true, "http2": true, "hsts": false, "sticky": false, "forwardHeaders": true, "rateLimit": 0, "maxconn": 4096, "timeoutClient": "30s", "timeoutServer": "30s", "timeoutConnect": "5s", "stats": false, "statsPort": 8404, "statsAuth": ""} as Options;

export function HaproxyConfigGeneratorToolView() {
  const [in0, setIn0] = useState("example.com -> 10.0.0.1:8080, 10.0.0.2:8080\napi.example.com -> 10.0.0.3:9000");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => haproxyConfigGenerator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Mode"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.mode} onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}>
            <option value={"http"}>{"HTTP (L7)"}</option>
            <option value={"tcp"}>{"TCP (L4)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Balance"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.balance} onChange={(e) => setOptions((o) => ({ ...o, balance: e.target.value as Options["balance"] }))}>
            <option value={"roundrobin"}>{"Round robin"}</option>
            <option value={"leastconn"}>{"Least connections"}</option>
            <option value={"source"}>{"Source IP hash"}</option>
            <option value={"uri"}>{"URI hash"}</option>
            <option value={"first"}>{"First available"}</option>
            <option value={"random"}>{"Random"}</option>
          </select>
        </label>
        {["http"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Health path"}
          <input type="text" value={options.healthPath} placeholder={"/health (empty = TCP check)"} onChange={(e) => setOptions((o) => ({ ...o, healthPath: e.target.value }))} className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["true"].includes(String(options.tls)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"PEM path"}
          <input type="text" value={options.certPath} placeholder={"/etc/haproxy/certs/site.pem"} onChange={(e) => setOptions((o) => ({ ...o, certPath: e.target.value }))} className="w-60 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"maxconn"}
          <input type="number" min={1} max={1000000} step={100} value={options.maxconn} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, maxconn: Math.min(1000000, Math.max(1, n)) })); }} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        {["http"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Rate limit (req/10s per IP, 0 = off)"}
          <input type="number" min={0} max={100000} step={10} value={options.rateLimit} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, rateLimit: Math.min(100000, Math.max(0, n)) })); }} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Connect"}
          <input type="text" value={options.timeoutConnect} placeholder={"5s"} onChange={(e) => setOptions((o) => ({ ...o, timeoutConnect: e.target.value }))} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Client"}
          <input type="text" value={options.timeoutClient} placeholder={"30s"} onChange={(e) => setOptions((o) => ({ ...o, timeoutClient: e.target.value }))} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Server"}
          <input type="text" value={options.timeoutServer} placeholder={"30s"} onChange={(e) => setOptions((o) => ({ ...o, timeoutServer: e.target.value }))} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        {["http"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.tls} onChange={(e) => setOptions((o) => ({ ...o, tls: e.target.checked }))} />
          {"TLS (443)"}
        </label>
        )}
        {["true"].includes(String(options.tls)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.redirectHttps} onChange={(e) => setOptions((o) => ({ ...o, redirectHttps: e.target.checked }))} />
          {"Redirect HTTP\u2192HTTPS"}
        </label>
        )}
        {["true"].includes(String(options.tls)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.http2} onChange={(e) => setOptions((o) => ({ ...o, http2: e.target.checked }))} />
          {"HTTP/2"}
        </label>
        )}
        {["true"].includes(String(options.tls)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.hsts} onChange={(e) => setOptions((o) => ({ ...o, hsts: e.target.checked }))} />
          {"HSTS"}
        </label>
        )}
        {["http"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.sticky} onChange={(e) => setOptions((o) => ({ ...o, sticky: e.target.checked }))} />
          {"Sticky sessions"}
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.stats} onChange={(e) => setOptions((o) => ({ ...o, stats: e.target.checked }))} />
          {"Stats page"}
        </label>
        {["true"].includes(String(options.stats)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Stats port"}
          <input type="number" min={1} max={65535} step={1} value={options.statsPort} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, statsPort: Math.min(65535, Math.max(1, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        {["true"].includes(String(options.stats)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Stats user:pass"}
          <input type="text" value={options.statsAuth} placeholder={"empty = localhost only"} onChange={(e) => setOptions((o) => ({ ...o, statsAuth: e.target.value }))} className="w-44 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Routes (http: host -> server:port, \u2026   tcp: :port -> server:port, \u2026)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"example.com -> 10.0.0.1:8080, 10.0.0.2:8080\napi.example.com -> 10.0.0.3:9000\n* -> 10.0.0.9:80"}
                  aria-label={"Routes (http: host -> server:port, \u2026   tcp: :port -> server:port, \u2026)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"haproxy.cfg"} fileName={"haproxy.cfg"} value={result.output} error={result.error?.message ?? null} placeholder={"Add a route such as: example.com -> 10.0.0.1:8080"} />}
        />
      </div>
    </div>
  );
}
