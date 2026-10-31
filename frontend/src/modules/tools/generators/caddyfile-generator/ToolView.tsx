"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { caddyfileGenerator } from "./transform";
import type { CaddyfileGeneratorOptions } from "./schema";

type Options = CaddyfileGeneratorOptions;

const defaultOptions: Options = {"email": "", "encode": "both", "securityHeaders": true, "hsts": false, "spa": false, "fileBrowse": false, "lbPolicy": "round_robin", "healthPath": "", "wwwRedirect": "none", "log": "none", "tlsInternal": false, "maxBody": "", "adminOff": false, "http3": true} as Options;

export function CaddyfileGeneratorToolView() {
  const [in0, setIn0] = useState("example.com -> localhost:3000");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => caddyfileGenerator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"ACME e-mail"}
          <input type="text" value={options.email} placeholder={"ops@example.com"} onChange={(e) => setOptions((o) => ({ ...o, email: e.target.value }))} className="w-48 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Compression"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.encode} onChange={(e) => setOptions((o) => ({ ...o, encode: e.target.value as Options["encode"] }))}>
            <option value={"both"}>{"zstd + gzip"}</option>
            <option value={"zstd"}>{"zstd"}</option>
            <option value={"gzip"}>{"gzip"}</option>
            <option value={"none"}>{"None"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"www"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.wwwRedirect} onChange={(e) => setOptions((o) => ({ ...o, wwwRedirect: e.target.value as Options["wwwRedirect"] }))}>
            <option value={"none"}>{"Leave alone"}</option>
            <option value={"to-apex"}>{"www \u2192 apex"}</option>
            <option value={"to-www"}>{"apex \u2192 www"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Load balancing"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.lbPolicy} onChange={(e) => setOptions((o) => ({ ...o, lbPolicy: e.target.value as Options["lbPolicy"] }))}>
            <option value={"round_robin"}>{"Round robin"}</option>
            <option value={"least_conn"}>{"Least connections"}</option>
            <option value={"random"}>{"Random"}</option>
            <option value={"ip_hash"}>{"IP hash"}</option>
            <option value={"first"}>{"First available"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Health check"}
          <input type="text" value={options.healthPath} placeholder={"/health"} onChange={(e) => setOptions((o) => ({ ...o, healthPath: e.target.value }))} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Max body"}
          <input type="text" value={options.maxBody} placeholder={"10MB"} onChange={(e) => setOptions((o) => ({ ...o, maxBody: e.target.value }))} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Access log"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.log} onChange={(e) => setOptions((o) => ({ ...o, log: e.target.value as Options["log"] }))}>
            <option value={"none"}>{"Off"}</option>
            <option value={"stdout"}>{"stdout"}</option>
            <option value={"file"}>{"File"}</option>
          </select>
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
          <input type="checkbox" checked={options.spa} onChange={(e) => setOptions((o) => ({ ...o, spa: e.target.checked }))} />
          {"SPA fallback"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.fileBrowse} onChange={(e) => setOptions((o) => ({ ...o, fileBrowse: e.target.checked }))} />
          {"Directory listing"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.tlsInternal} onChange={(e) => setOptions((o) => ({ ...o, tlsInternal: e.target.checked }))} />
          {"Internal TLS (dev)"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.http3} onChange={(e) => setOptions((o) => ({ ...o, http3: e.target.checked }))} />
          {"HTTP/3"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.adminOff} onChange={(e) => setOptions((o) => ({ ...o, adminOff: e.target.checked }))} />
          {"Disable admin API"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Sites (one per line)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"example.com -> localhost:3000\napi.example.com -> 10.0.0.5:8080, 10.0.0.6:8080\nstatic.example.com => /var/www/html\nold.example.com redirect https://example.com{uri}"}
                  aria-label={"Sites (one per line)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Caddyfile"} fileName={"Caddyfile"} value={result.output} error={result.error?.message ?? null} placeholder={"Add a site such as: example.com -> localhost:3000"} />}
        />
      </div>
    </div>
  );
}
