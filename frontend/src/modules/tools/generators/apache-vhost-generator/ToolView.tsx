"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { apacheVhostGenerator } from "./transform";
import type { ApacheVhostGeneratorOptions } from "./schema";

type Options = ApacheVhostGeneratorOptions;

const defaultOptions: Options = {"siteType": "static", "docRoot": "/var/www/{domain}/public", "tls": "redirect", "certFile": "/etc/letsencrypt/live/{domain}/fullchain.pem", "keyFile": "/etc/letsencrypt/live/{domain}/privkey.pem", "tlsProfile": "intermediate", "http2": true, "hsts": false, "hstsDays": 365, "proxyTarget": "http://127.0.0.1:3000", "websocket": false, "phpHandler": "unix:/run/php/php8.3-fpm.sock", "redirectTo": "https://example.com/", "wwwRedirect": "none", "securityHeaders": true, "compression": true, "staticCache": false, "noIndexes": true, "allowOverride": false, "logDir": "${APACHE_LOG_DIR}", "logFormat": "combined", "serverAdmin": "", "maxBodyMb": 0, "moduleHints": true} as Options;

export function ApacheVhostGeneratorToolView() {
  const [in0, setIn0] = useState("example.com www.example.com\napi.example.com");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => apacheVhostGenerator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Site type"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.siteType} onChange={(e) => setOptions((o) => ({ ...o, siteType: e.target.value as Options["siteType"] }))}>
            <option value={"static"}>{"Static files"}</option>
            <option value={"spa"}>{"Single-page app"}</option>
            <option value={"proxy"}>{"Reverse proxy"}</option>
            <option value={"php-fpm"}>{"PHP-FPM"}</option>
            <option value={"redirect"}>{"Redirect only"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"HTTPS"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.tls} onChange={(e) => setOptions((o) => ({ ...o, tls: e.target.value as Options["tls"] }))}>
            <option value={"redirect"}>{"HTTP \u2192 HTTPS redirect"}</option>
            <option value={"https-only"}>{"HTTPS only"}</option>
            <option value={"none"}>{"HTTP only"}</option>
          </select>
        </label>
        {["redirect", "https-only"].includes(String(options.tls)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"TLS profile"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.tlsProfile} onChange={(e) => setOptions((o) => ({ ...o, tlsProfile: e.target.value as Options["tlsProfile"] }))}>
            <option value={"intermediate"}>{"Intermediate (TLS 1.2+)"}</option>
            <option value={"modern"}>{"Modern (TLS 1.3)"}</option>
          </select>
        </label>
        )}
        {["redirect", "https-only"].includes(String(options.tls)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.http2} onChange={(e) => setOptions((o) => ({ ...o, http2: e.target.checked }))} />
          {"HTTP/2"}
        </label>
        )}
        {["redirect", "https-only"].includes(String(options.tls)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.hsts} onChange={(e) => setOptions((o) => ({ ...o, hsts: e.target.checked }))} />
          {"HSTS"}
        </label>
        )}
        {["true"].includes(String(options.hsts)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"HSTS days"}
          <input type="number" min={1} max={730} value={options.hstsDays} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, hstsDays: Math.min(730, Math.max(1, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"www"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.wwwRedirect} onChange={(e) => setOptions((o) => ({ ...o, wwwRedirect: e.target.value as Options["wwwRedirect"] }))}>
            <option value={"none"}>{"Leave as listed"}</option>
            <option value={"to-apex"}>{"www \u2192 apex"}</option>
            <option value={"to-www"}>{"apex \u2192 www"}</option>
          </select>
        </label>
        {["static", "spa", "php-fpm"].includes(String(options.siteType)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Document root"}
          <input type="text" value={options.docRoot} placeholder={"/var/www/{domain}/public"} onChange={(e) => setOptions((o) => ({ ...o, docRoot: e.target.value }))} className="w-56 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["proxy"].includes(String(options.siteType)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Backend"}
          <input type="text" value={options.proxyTarget} placeholder={"http://127.0.0.1:3000"} onChange={(e) => setOptions((o) => ({ ...o, proxyTarget: e.target.value }))} className="w-52 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["proxy"].includes(String(options.siteType)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.websocket} onChange={(e) => setOptions((o) => ({ ...o, websocket: e.target.checked }))} />
          {"WebSockets"}
        </label>
        )}
        {["php-fpm"].includes(String(options.siteType)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"PHP-FPM"}
          <input type="text" value={options.phpHandler} placeholder={"unix:/run/php/php8.3-fpm.sock"} onChange={(e) => setOptions((o) => ({ ...o, phpHandler: e.target.value }))} className="w-60 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["redirect"].includes(String(options.siteType)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Redirect to"}
          <input type="text" value={options.redirectTo} placeholder={"https://example.com/"} onChange={(e) => setOptions((o) => ({ ...o, redirectTo: e.target.value }))} className="w-52 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["redirect", "https-only"].includes(String(options.tls)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Certificate"}
          <input type="text" value={options.certFile} placeholder={"/etc/letsencrypt/live/{domain}/fullchain.pem"} onChange={(e) => setOptions((o) => ({ ...o, certFile: e.target.value }))} className="w-64 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["redirect", "https-only"].includes(String(options.tls)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Key"}
          <input type="text" value={options.keyFile} placeholder={"/etc/letsencrypt/live/{domain}/privkey.pem"} onChange={(e) => setOptions((o) => ({ ...o, keyFile: e.target.value }))} className="w-64 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["static", "spa", "proxy", "php-fpm"].includes(String(options.siteType)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.securityHeaders} onChange={(e) => setOptions((o) => ({ ...o, securityHeaders: e.target.checked }))} />
          {"Security headers"}
        </label>
        )}
        {["static", "spa", "proxy", "php-fpm"].includes(String(options.siteType)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.compression} onChange={(e) => setOptions((o) => ({ ...o, compression: e.target.checked }))} />
          {"Compression"}
        </label>
        )}
        {["static", "spa", "php-fpm"].includes(String(options.siteType)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.staticCache} onChange={(e) => setOptions((o) => ({ ...o, staticCache: e.target.checked }))} />
          {"Cache static assets"}
        </label>
        )}
        {["static", "spa", "php-fpm"].includes(String(options.siteType)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.noIndexes} onChange={(e) => setOptions((o) => ({ ...o, noIndexes: e.target.checked }))} />
          {"Disable directory listing"}
        </label>
        )}
        {["static", "spa", "php-fpm"].includes(String(options.siteType)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.allowOverride} onChange={(e) => setOptions((o) => ({ ...o, allowOverride: e.target.checked }))} />
          {"Allow .htaccess"}
        </label>
        )}
        {["static", "spa", "proxy", "php-fpm"].includes(String(options.siteType)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Max upload MB"}
          <input type="number" min={0} max={10240} value={options.maxBodyMb} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, maxBodyMb: Math.min(10240, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Log format"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.logFormat} onChange={(e) => setOptions((o) => ({ ...o, logFormat: e.target.value as Options["logFormat"] }))}>
            <option value={"combined"}>{"combined"}</option>
            <option value={"common"}>{"common"}</option>
            <option value={"vhost_combined"}>{"vhost_combined"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Log dir"}
          <input type="text" value={options.logDir} placeholder={"${APACHE_LOG_DIR}"} onChange={(e) => setOptions((o) => ({ ...o, logDir: e.target.value }))} className="w-44 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"ServerAdmin"}
          <input type="text" value={options.serverAdmin} placeholder={"ops@example.com"} onChange={(e) => setOptions((o) => ({ ...o, serverAdmin: e.target.value }))} className="w-44 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.moduleHints} onChange={(e) => setOptions((o) => ({ ...o, moduleHints: e.target.checked }))} />
          {"a2enmod hints"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Sites (one per line: name followed by aliases)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"example.com www.example.com"}
                  aria-label={"Sites (one per line: name followed by aliases)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Apache config"} fileName={"apache-vhost.conf"} value={result.output} error={result.error?.message ?? null} placeholder={"Enter a host name"} />}
        />
      </div>
    </div>
  );
}
