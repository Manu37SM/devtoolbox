"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { base85UuencodeConverter } from "./transform";
import type { Base85UuencodeConverterOptions } from "./schema";

type Options = Base85UuencodeConverterOptions;

const defaultOptions: Options = {"action": "encode", "format": "ascii85", "inputKind": "text", "outputKind": "text", "wrap": 0, "fileName": "data.bin", "fileMode": "644", "backtick": true} as Options;

export function Base85UuencodeConverterToolView() {
  const [in0, setIn0] = useState("Hello, DevToolbox!");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => base85UuencodeConverter(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Action"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.action} onChange={(e) => setOptions((o) => ({ ...o, action: e.target.value as Options["action"] }))}>
            <option value={"encode"}>{"Encode"}</option>
            <option value={"decode"}>{"Decode"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Format"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.format} onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}>
            <option value={"ascii85"}>{"Ascii85 / btoa"}</option>
            <option value={"adobe"}>{"Ascii85 with <~ ~>"}</option>
            <option value={"rfc1924"}>{"Base85 (RFC 1924)"}</option>
            <option value={"z85"}>{"Z85 (ZeroMQ)"}</option>
            <option value={"uuencode"}>{"uuencode"}</option>
          </select>
        </label>
        {["encode"].includes(String(options.action)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Input is"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.inputKind} onChange={(e) => setOptions((o) => ({ ...o, inputKind: e.target.value as Options["inputKind"] }))}>
            <option value={"text"}>{"Text (UTF-8)"}</option>
            <option value={"hex"}>{"Hex bytes"}</option>
          </select>
        </label>
        )}
        {["decode"].includes(String(options.action)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Show result as"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.outputKind} onChange={(e) => setOptions((o) => ({ ...o, outputKind: e.target.value as Options["outputKind"] }))}>
            <option value={"text"}>{"Text (UTF-8)"}</option>
            <option value={"hex"}>{"Hex bytes"}</option>
          </select>
        </label>
        )}
        {["ascii85", "adobe", "rfc1924", "z85"].includes(String(options.format)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Wrap at (0 = off)"}
          <input type="number" min={0} max={1000} step={1} value={options.wrap} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, wrap: Math.min(1000, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        {["uuencode"].includes(String(options.format)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"File name"}
          <input type="text" value={options.fileName} placeholder={"data.bin"} onChange={(e) => setOptions((o) => ({ ...o, fileName: e.target.value }))} className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["uuencode"].includes(String(options.format)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Mode"}
          <input type="text" value={options.fileMode} placeholder={"644"} onChange={(e) => setOptions((o) => ({ ...o, fileMode: e.target.value }))} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["uuencode"].includes(String(options.format)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.backtick} onChange={(e) => setOptions((o) => ({ ...o, backtick: e.target.checked }))} />
          {"Use ` for zero"}
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Input"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"Text, hex bytes, or an encoded block"}
                  aria-label={"Input"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Result"} fileName={"encoded.txt"} value={result.output} error={result.error?.message ?? null} placeholder={"Encoded or decoded output appears here"} />}
        />
      </div>
    </div>
  );
}
