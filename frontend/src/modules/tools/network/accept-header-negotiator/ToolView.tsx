"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { acceptHeaderNegotiator } from "./transform";
import type { AcceptHeaderNegotiatorOptions } from "./schema";

type Options = AcceptHeaderNegotiatorOptions;

const defaultOptions: Options = {"kind": "accept", "mode": "negotiate", "offered": "application/json, text/html", "reasons": true, "responseHints": true} as Options;

export function AcceptHeaderNegotiatorToolView() {
  const [in0, setIn0] = useState("text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => acceptHeaderNegotiator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Header"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.kind} onChange={(e) => setOptions((o) => ({ ...o, kind: e.target.value as Options["kind"] }))}>
            <option value={"accept"}>{"Accept"}</option>
            <option value={"language"}>{"Accept-Language"}</option>
            <option value={"encoding"}>{"Accept-Encoding"}</option>
            <option value={"charset"}>{"Accept-Charset"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Mode"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.mode} onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}>
            <option value={"negotiate"}>{"Negotiate"}</option>
            <option value={"parse"}>{"Parse only"}</option>
          </select>
        </label>
        {["negotiate"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Server offers"}
          <input type="text" value={options.offered} placeholder={"application/json, text/html"} onChange={(e) => setOptions((o) => ({ ...o, offered: e.target.value }))} className="w-72 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["negotiate"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.reasons} onChange={(e) => setOptions((o) => ({ ...o, reasons: e.target.checked }))} />
          {"Show reasons"}
        </label>
        )}
        {["negotiate"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.responseHints} onChange={(e) => setOptions((o) => ({ ...o, responseHints: e.target.checked }))} />
          {"Vary / response hints"}
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Header value"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"}
                  aria-label={"Header value"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Negotiation"} value={result.output} error={result.error?.message ?? null} placeholder={"Paste an Accept header"} />}
        />
      </div>
    </div>
  );
}
