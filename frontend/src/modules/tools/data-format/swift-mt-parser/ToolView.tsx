"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { swiftMtParser } from "./transform";
import type { SwiftMtParserOptions } from "./schema";

type Options = SwiftMtParserOptions;

const defaultOptions: Options = {"output": "summary", "validate": true, "headers": true, "yearPivot": 79, "groupAmounts": true} as Options;

export function SwiftMtParserToolView() {
  const [in0, setIn0] = useState("{1:F01BANKBEBBAXXX0000000000}{2:I103BANKDEFFXXXXN}{3:{108:MT103 EXAMPLE}{121:eb6305c9-1f7f-49de-aed0-16487c27b42d}}{4:\n:20:REF12345678\n:23B:CRED\n:32A:260301EUR1234567,89\n:50K:/DE89370400440532013000\nACME GMBH\nHAUPTSTRASSE 1\n10115 BERLIN\n:57A:BANKFRPP\n:59:/FR1420041010050500013M02606\nJEAN DUPONT\nPARIS\n:70:INVOICE 2026-0042\n:71A:SHA\n-}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => swiftMtParser(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Output"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.output} onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}>
            <option value={"summary"}>{"Summary"}</option>
            <option value={"fields"}>{"Field list"}</option>
            <option value={"json"}>{"JSON"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.validate} onChange={(e) => setOptions((o) => ({ ...o, validate: e.target.checked }))} />
          {"Validate"}
        </label>
        {["summary", "json"].includes(String(options.output)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.headers} onChange={(e) => setOptions((o) => ({ ...o, headers: e.target.checked }))} />
          {"Headers"}
        </label>
        )}
        {["summary"].includes(String(options.output)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.groupAmounts} onChange={(e) => setOptions((o) => ({ ...o, groupAmounts: e.target.checked }))} />
          {"Group digits"}
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Year pivot (00\u2013N = 20xx)"}
          <input type="number" min={0} max={99} value={options.yearPivot} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, yearPivot: Math.min(99, Math.max(0, n)) })); }} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"FIN message (blocks 1\u20135)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"{1:...}{2:...}{4:\n:20:...\n-}"}
                  aria-label={"FIN message (blocks 1\u20135)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Parsed message"} value={result.output} error={result.error?.message ?? null} placeholder={"Paste a MT103, MT202 or MT940 message"} />}
        />
      </div>
    </div>
  );
}
