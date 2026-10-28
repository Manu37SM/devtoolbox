"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { generateNginx } from "./transform";
import type { NginxConfigGeneratorOptions } from "./schema";

type Options = NginxConfigGeneratorOptions;

const defaultOptions: Options = {"kind":"reverse-proxy","ssl":true,"hsts":true,"gzip":true,"websocket":false,"securityHeaders":true} as Options;

export function NginxConfigGeneratorToolView() {
  const [input, setInput] = useState("server_name: example.com www.example.com\nupstream: 127.0.0.1:8080\nmax_body: 20m");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateNginx(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Type
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.kind}
            onChange={(e) => setOptions((o) => ({ ...o, kind: e.target.value as Options["kind"] }))}
          >
            <option value="reverse-proxy">{"Reverse proxy"}</option>
            <option value="load-balancer">{"Load balancer"}</option>
            <option value="static-site">{"Static site"}</option>
            <option value="spa">{"Single-page app"}</option>
            <option value="php-fpm">{"PHP-FPM"}</option>
            <option value="https-redirect">{"HTTP to HTTPS redirect"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.ssl} onChange={(e) => setOptions((o) => ({ ...o, ssl: e.target.checked }))} />
          TLS
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.hsts} onChange={(e) => setOptions((o) => ({ ...o, hsts: e.target.checked }))} />
          HSTS
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.gzip} onChange={(e) => setOptions((o) => ({ ...o, gzip: e.target.checked }))} />
          gzip
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.websocket} onChange={(e) => setOptions((o) => ({ ...o, websocket: e.target.checked }))} />
          WebSocket
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.securityHeaders} onChange={(e) => setOptions((o) => ({ ...o, securityHeaders: e.target.checked }))} />
          Security headers
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Fields: server_name, upstream, root, lb, max_body, cert_dir</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="server_name: example.com"
                aria-label="Fields: server_name, upstream, root, lb, max_body, cert_dir"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
