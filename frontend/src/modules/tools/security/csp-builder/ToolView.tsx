"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { buildCsp } from "./transform";
import type { CspBuilderOptions } from "./schema";

type Options = CspBuilderOptions;

const defaultOptions: Options = {"defaultSrc":"self","inlineScripts":false,"evalScripts":false,"inlineStyles":false,"allowData":true,"blockObjects":true,"baseUri":true,"formAction":true,"frameAncestors":"none","upgradeInsecure":true,"reportOnly":false} as Options;

export function CspBuilderToolView() {
  const [input, setInput] = useState("script-src https://cdn.jsdelivr.net\nstyle-src https://fonts.googleapis.com\nfont-src https://fonts.gstatic.com\nconnect-src https://api.example.com");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => buildCsp(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          default-src
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.defaultSrc}
            onChange={(e) => setOptions((o) => ({ ...o, defaultSrc: e.target.value as Options["defaultSrc"] }))}
          >
            <option value="self">{"'self'"}</option>
            <option value="none">{"'none' (explicit allow-list)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.inlineScripts} onChange={(e) => setOptions((o) => ({ ...o, inlineScripts: e.target.checked }))} />
          Allow inline scripts
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.evalScripts} onChange={(e) => setOptions((o) => ({ ...o, evalScripts: e.target.checked }))} />
          Allow eval
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.inlineStyles} onChange={(e) => setOptions((o) => ({ ...o, inlineStyles: e.target.checked }))} />
          Allow inline styles
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.allowData} onChange={(e) => setOptions((o) => ({ ...o, allowData: e.target.checked }))} />
          data: images
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.blockObjects} onChange={(e) => setOptions((o) => ({ ...o, blockObjects: e.target.checked }))} />
          object-src &apos;none&apos;
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.baseUri} onChange={(e) => setOptions((o) => ({ ...o, baseUri: e.target.checked }))} />
          base-uri &apos;self&apos;
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.formAction} onChange={(e) => setOptions((o) => ({ ...o, formAction: e.target.checked }))} />
          form-action &apos;self&apos;
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          frame-ancestors
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.frameAncestors}
            onChange={(e) => setOptions((o) => ({ ...o, frameAncestors: e.target.value as Options["frameAncestors"] }))}
          >
            <option value="none">{"'none'"}</option>
            <option value="self">{"'self'"}</option>
            <option value="unset">{"not set"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.upgradeInsecure} onChange={(e) => setOptions((o) => ({ ...o, upgradeInsecure: e.target.checked }))} />
          Upgrade insecure requests
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.reportOnly} onChange={(e) => setOptions((o) => ({ ...o, reportOnly: e.target.checked }))} />
          Report-Only
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Extra sources (one directive per line)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"script-src https://cdn.example.com\nconnect-src https://api.example.com"}
                aria-label="Extra sources (one directive per line)"
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
