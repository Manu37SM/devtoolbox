"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { htaccessGenerator } from "./transform";
import type { HtaccessGeneratorOptions } from "./schema";

type Options = HtaccessGeneratorOptions;

const defaultOptions: Options = {"forceHttps": true, "behindProxy": false, "www": "none", "spa": false, "noIndexes": true, "blockDotfiles": true, "securityHeaders": true, "hsts": false, "gzip": true, "cache": true, "cacheDays": 365, "charset": true, "errorPage404": "", "hotlinkDomain": "", "denyIps": "", "corsOrigin": "", "authRealm": "", "authFile": "/home/user/.htpasswd"} as Options;

export function HtaccessGeneratorToolView() {
  const [in0, setIn0] = useState("/old-page -> /new-page");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => htaccessGenerator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"www"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.www} onChange={(e) => setOptions((o) => ({ ...o, www: e.target.value as Options["www"] }))}>
            <option value={"none"}>{"Leave alone"}</option>
            <option value={"to-www"}>{"apex \u2192 www"}</option>
            <option value={"to-apex"}>{"www \u2192 apex"}</option>
          </select>
        </label>
        {["true"].includes(String(options.cache)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Cache days"}
          <input type="number" min={1} max={3650} step={1} value={options.cacheDays} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, cacheDays: Math.min(3650, Math.max(1, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"404 page"}
          <input type="text" value={options.errorPage404} placeholder={"/404.html"} onChange={(e) => setOptions((o) => ({ ...o, errorPage404: e.target.value }))} className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Block hotlinking except"}
          <input type="text" value={options.hotlinkDomain} placeholder={"example.com"} onChange={(e) => setOptions((o) => ({ ...o, hotlinkDomain: e.target.value }))} className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Block IPs / CIDR"}
          <input type="text" value={options.denyIps} placeholder={"203.0.113.7, 10.0.0.0/8"} onChange={(e) => setOptions((o) => ({ ...o, denyIps: e.target.value }))} className="w-56 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"CORS origin"}
          <input type="text" value={options.corsOrigin} placeholder={"* or https://app.example.com"} onChange={(e) => setOptions((o) => ({ ...o, corsOrigin: e.target.value }))} className="w-56 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Basic-auth realm"}
          <input type="text" value={options.authRealm} placeholder={"Staff only"} onChange={(e) => setOptions((o) => ({ ...o, authRealm: e.target.value }))} className="w-36 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        {options.authRealm !== "" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {".htpasswd path"}
          <input type="text" value={options.authFile} placeholder={"/home/user/.htpasswd"} onChange={(e) => setOptions((o) => ({ ...o, authFile: e.target.value }))} className="w-56 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.forceHttps} onChange={(e) => setOptions((o) => ({ ...o, forceHttps: e.target.checked }))} />
          {"Force HTTPS"}
        </label>
        {["true"].includes(String(options.forceHttps)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.behindProxy} onChange={(e) => setOptions((o) => ({ ...o, behindProxy: e.target.checked }))} />
          {"Behind proxy/CDN"}
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.spa} onChange={(e) => setOptions((o) => ({ ...o, spa: e.target.checked }))} />
          {"SPA fallback"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.noIndexes} onChange={(e) => setOptions((o) => ({ ...o, noIndexes: e.target.checked }))} />
          {"No directory listing"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.blockDotfiles} onChange={(e) => setOptions((o) => ({ ...o, blockDotfiles: e.target.checked }))} />
          {"Block dotfiles"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.securityHeaders} onChange={(e) => setOptions((o) => ({ ...o, securityHeaders: e.target.checked }))} />
          {"Security headers"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.hsts} onChange={(e) => setOptions((o) => ({ ...o, hsts: e.target.checked }))} />
          {"HSTS"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.gzip} onChange={(e) => setOptions((o) => ({ ...o, gzip: e.target.checked }))} />
          {"Compression"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.cache} onChange={(e) => setOptions((o) => ({ ...o, cache: e.target.checked }))} />
          {"Caching"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.charset} onChange={(e) => setOptions((o) => ({ ...o, charset: e.target.checked }))} />
          {"UTF-8 default"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Redirects (optional): [301|302|303|307|308|410] /old -> /new"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"/old-page -> /new-page\n302 /sale -> https://example.com/offers\n410 /retired\n^/blog/(.*)$ -> /posts/$1"}
                  aria-label={"Redirects (optional): [301|302|303|307|308|410] /old -> /new"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={".htaccess"} fileName={".htaccess"} value={result.output} error={result.error?.message ?? null} placeholder={"Pick options on the left; add redirects above if needed"} />}
        />
      </div>
    </div>
  );
}
