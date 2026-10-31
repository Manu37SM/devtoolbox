"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { pemToolkit } from "./transform";
import type { PemToolkitOptions } from "./schema";

type Options = PemToolkitOptions;

const defaultOptions: Options = {"action": "list", "index": 1, "labelFilter": "", "label": "CERTIFICATE", "lineWidth": 64, "derFormat": "base64", "eol": "lf"} as Options;

export function PemToolkitToolView() {
  const [in0, setIn0] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => pemToolkit(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Action"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.action} onChange={(e) => setOptions((o) => ({ ...o, action: e.target.value as Options["action"] }))}>
            <option value={"list"}>{"List blocks"}</option>
            <option value={"extract"}>{"Extract block"}</option>
            <option value={"rewrap"}>{"Re-wrap lines"}</option>
            <option value={"strip"}>{"Strip headers"}</option>
            <option value={"to-der"}>{"PEM \u2192 DER"}</option>
            <option value={"from-der"}>{"DER \u2192 PEM"}</option>
            <option value={"reverse"}>{"Reverse order"}</option>
            <option value={"dedupe"}>{"Remove duplicates"}</option>
          </select>
        </label>
        {["extract", "to-der"].includes(String(options.action)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Block #"}
          <input type="number" min={0} max={1000} value={options.index} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, index: Math.min(1000, Math.max(0, n)) })); }} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        {["list", "extract", "rewrap", "strip", "to-der", "reverse", "dedupe"].includes(String(options.action)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Only label"}
          <input type="text" value={options.labelFilter} placeholder={"CERTIFICATE"} onChange={(e) => setOptions((o) => ({ ...o, labelFilter: e.target.value }))} className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["from-der"].includes(String(options.action)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Label"}
          <input type="text" value={options.label} placeholder={"CERTIFICATE"} onChange={(e) => setOptions((o) => ({ ...o, label: e.target.value }))} className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["extract", "rewrap", "from-der", "reverse", "dedupe"].includes(String(options.action)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Line width"}
          <input type="number" min={16} max={1000} value={options.lineWidth} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, lineWidth: Math.min(1000, Math.max(16, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        {["to-der", "from-der"].includes(String(options.action)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"DER as"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.derFormat} onChange={(e) => setOptions((o) => ({ ...o, derFormat: e.target.value as Options["derFormat"] }))}>
            <option value={"base64"}>{"Base64"}</option>
            <option value={"hex"}>{"Hex"}</option>
            <option value={"hex-spaced"}>{"Hex (spaced)"}</option>
          </select>
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Line ending"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.eol} onChange={(e) => setOptions((o) => ({ ...o, eol: e.target.value as Options["eol"] }))}>
            <option value={"lf"}>{"LF"}</option>
            <option value={"crlf"}>{"CRLF"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"PEM text (or DER as base64/hex for DER \u2192 PEM)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"}
                  aria-label={"PEM text (or DER as base64/hex for DER \u2192 PEM)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Result"} fileName={"result.pem"} value={result.output} error={result.error?.message ?? null} placeholder={"Paste a PEM file or certificate bundle"} />}
        />
      </div>
    </div>
  );
}
