"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runSecurityHeadersGenerator } from "./transform";
import type { SecurityHeadersGeneratorOptions } from "./schema";

type Options = SecurityHeadersGeneratorOptions;

const defaultOptions: Options = {"target":"nginx"} as Options;

export function SecurityHeadersGeneratorToolView() {
  const [input, setInput] = useState("hsts: max-age=31536000; includeSubDomains\ncsp: default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'\nreferrer-policy: strict-origin-when-cross-origin\npermissions-policy: camera=(), microphone=(), geolocation=()\nframe-options: DENY\ncoop: same-origin");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runSecurityHeadersGenerator(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Target
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.target}
            onChange={(e) => setOptions((o) => ({ ...o, target: e.target.value as Options["target"] }))}
          >
            <option value="nginx">{"nginx"}</option>
            <option value="apache">{"Apache"}</option>
            <option value="express">{"Express"}</option>
            <option value="spring-security">{"Spring Security"}</option>
            <option value="kong">{"Kong"}</option>
            <option value="apigee">{"Apigee"}</option>
            <option value="iis">{"IIS web.config"}</option>
            <option value="caddy">{"Caddy"}</option>
            <option value="netlify">{"Netlify _headers"}</option>
            <option value="vercel">{"vercel.json"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Headers (short names: hsts, csp, referrer-policy, permissions-policy, frame-options, coop, coep, corp)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="hsts: max-age=31536000"
                aria-label="Headers (short names: hsts, csp, referrer-policy, permissions-policy, frame-options, coop, coep, corp)"
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
