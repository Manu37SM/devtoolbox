"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { mimeEncodedWord } from "./transform";
import type { MimeEncodedWordOptions } from "./schema";

type Options = MimeEncodedWordOptions;

const defaultOptions: Options = {"mode": "word-encode", "charset": "utf-8", "wordEncoding": "auto", "forceEncode": false, "wordSeparator": "space", "lineLength": 76, "eol": "lf", "encodeAll": false} as Options;

export function MimeEncodedWordConverterToolView() {
  const [in0, setIn0] = useState("");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => mimeEncodedWord(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Mode"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.mode} onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}>
            <option value={"word-encode"}>{"Header \u2192 encoded word"}</option>
            <option value={"word-decode"}>{"Encoded word \u2192 text"}</option>
            <option value={"qp-encode"}>{"Quoted-printable encode"}</option>
            <option value={"qp-decode"}>{"Quoted-printable decode"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Charset"}
          <input type="text" value={options.charset} placeholder={"utf-8"} onChange={(e) => setOptions((o) => ({ ...o, charset: e.target.value }))} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        {["word-encode"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Encoding"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.wordEncoding} onChange={(e) => setOptions((o) => ({ ...o, wordEncoding: e.target.value as Options["wordEncoding"] }))}>
            <option value={"auto"}>{"Shortest (Q or B)"}</option>
            <option value={"Q"}>{"Q (quoted-printable)"}</option>
            <option value={"B"}>{"B (base64)"}</option>
          </select>
        </label>
        )}
        {["word-encode"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Between words"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.wordSeparator} onChange={(e) => setOptions((o) => ({ ...o, wordSeparator: e.target.value as Options["wordSeparator"] }))}>
            <option value={"space"}>{"Space"}</option>
            <option value={"fold"}>{"Fold onto new line"}</option>
          </select>
        </label>
        )}
        {["word-encode"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.forceEncode} onChange={(e) => setOptions((o) => ({ ...o, forceEncode: e.target.checked }))} />
          {"Encode ASCII too"}
        </label>
        )}
        {["qp-encode"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Line length"}
          <input type="number" min={0} max={998} value={options.lineLength} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, lineLength: Math.min(998, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        {["qp-encode"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.encodeAll} onChange={(e) => setOptions((o) => ({ ...o, encodeAll: e.target.checked }))} />
          {"Encode all symbols"}
        </label>
        )}
        {["qp-encode", "word-encode"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Line ending"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.eol} onChange={(e) => setOptions((o) => ({ ...o, eol: e.target.value as Options["eol"] }))}>
            <option value={"lf"}>{"LF"}</option>
            <option value={"crlf"}>{"CRLF"}</option>
          </select>
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
                  placeholder={"Subject: =?UTF-8?Q?caf=C3=A9?=  or plain text to encode"}
                  aria-label={"Input"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Output"} value={result.output} error={result.error?.message ?? null} placeholder={"Result will appear here"} />}
        />
      </div>
    </div>
  );
}
