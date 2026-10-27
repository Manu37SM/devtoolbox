"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";


import { parseCookies } from "./transform";
import type { CookieParserOptions } from "./schema";

type Options = CookieParserOptions;

const defaultOptions: Options = {"mode":"auto","decode":true} as Options;

export function CookieParserToolView() {
  const [input, setInput] = useState("Set-Cookie: sid=abc123; Path=/; HttpOnly");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => parseCookies(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Header
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.mode}
            onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}
          >
            <option value="auto">{"Auto-detect"}</option>
            <option value="cookie">{"Cookie"}</option>
            <option value="set-cookie">{"Set-Cookie"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.decode} onChange={(e) => setOptions((o) => ({ ...o, decode: e.target.checked }))} />
          URL-decode values
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Cookie headers (one per line)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Set-Cookie: sid=abc; Secure; HttpOnly"
                aria-label="Cookie headers (one per line)"
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
