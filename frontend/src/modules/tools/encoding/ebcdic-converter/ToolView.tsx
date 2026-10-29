"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runEbcdicConverter } from "./transform";
import type { EbcdicConverterOptions } from "./schema";

type Options = EbcdicConverterOptions;

const defaultOptions: Options = {"direction":"from-ebcdic","codePage":"037","newline":"nl"} as Options;

export function EbcdicConverterToolView() {
  const [input, setInput] = useState("E2 E3 C1 E3 C5 D4 C5 D5 E3 40 C1 C3 C3 E3 6B 40 C2 C1 D3 7A 40 F1 F2 F5 F0 F0 4B F0 F0");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runEbcdicConverter(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Direction
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.direction}
            onChange={(e) => setOptions((o) => ({ ...o, direction: e.target.value as Options["direction"] }))}
          >
            <option value="from-ebcdic">{"EBCDIC hex to text"}</option>
            <option value="to-ebcdic">{"Text to EBCDIC hex"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Code page
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.codePage}
            onChange={(e) => setOptions((o) => ({ ...o, codePage: e.target.value as Options["codePage"] }))}
          >
            <option value="037">{"037 (US/Canada)"}</option>
            <option value="1047">{"1047 (z/OS Latin-1)"}</option>
            <option value="500">{"500 (International)"}</option>
            <option value="1140">{"1140 (037 + euro)"}</option>
            <option value="273">{"273 (Germany)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Newline
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.newline}
            onChange={(e) => setOptions((o) => ({ ...o, newline: e.target.value as Options["newline"] }))}
          >
            <option value="nl">{"0x15 NEL (z/OS)"}</option>
            <option value="lf">{"0x25 LF"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">EBCDIC hex or text</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="C8 85 93 93 96"
                aria-label="EBCDIC hex or text"
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
