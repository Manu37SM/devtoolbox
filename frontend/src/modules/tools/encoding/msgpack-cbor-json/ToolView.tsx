"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runMsgpackCborJson } from "./transform";
import type { MsgpackCborJsonOptions } from "./schema";

type Options = MsgpackCborJsonOptions;

const defaultOptions: Options = {"format":"msgpack","direction":"decode","outputEncoding":"hex"} as Options;

export function MsgpackCborJsonToolView() {
  const [input, setInput] = useState("82 a7 63 6f 6d 70 61 63 74 c3 a6 73 63 68 65 6d 61 00");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runMsgpackCborJson(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Format
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.format}
            onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}
          >
            <option value="msgpack">{"MessagePack"}</option>
            <option value="cbor">{"CBOR"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Direction
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.direction}
            onChange={(e) => setOptions((o) => ({ ...o, direction: e.target.value as Options["direction"] }))}
          >
            <option value="decode">{"Bytes to JSON"}</option>
            <option value="encode">{"JSON to bytes"}</option>
          </select>
        </label>
        {options.direction === "encode" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.outputEncoding}
            onChange={(e) => setOptions((o) => ({ ...o, outputEncoding: e.target.value as Options["outputEncoding"] }))}
          >
            <option value="hex">{"Hex"}</option>
            <option value="base64">{"Base64"}</option>
          </select>
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Hex/base64 bytes, or JSON when encoding</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="82 a7 63 6f ..."
                aria-label="Hex/base64 bytes, or JSON when encoding"
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
