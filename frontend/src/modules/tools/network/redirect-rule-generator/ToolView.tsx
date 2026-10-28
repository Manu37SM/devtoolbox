"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { generateRedirects } from "./transform";
import type { RedirectRuleGeneratorOptions } from "./schema";

type Options = RedirectRuleGeneratorOptions;

const defaultOptions: Options = {"target":"nginx","defaultCode":"301"} as Options;

export function RedirectRuleGeneratorToolView() {
  const [input, setInput] = useState("/old-page /new-page\n/blog https://blog.example.com/ 302\n/docs/v1 /docs/v2 308");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateRedirects(input, options), [input, options]);

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
            <option value="apache">{"Apache .htaccess"}</option>
            <option value="netlify">{"Netlify _redirects"}</option>
            <option value="vercel">{"vercel.json"}</option>
            <option value="caddy">{"Caddy"}</option>
            <option value="cloudflare">{"Cloudflare CSV"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Default status
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.defaultCode}
            onChange={(e) => setOptions((o) => ({ ...o, defaultCode: e.target.value as Options["defaultCode"] }))}
          >
            <option value="301">{"301 Permanent"}</option>
            <option value="302">{"302 Found"}</option>
            <option value="307">{"307 Temporary"}</option>
            <option value="308">{"308 Permanent"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Rules (one per line): from-path, to, optional status</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="/old-page /new-page 301"
                aria-label="Rules (one per line): from-path, to, optional status"
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
