"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runProtobufBinaryDecoder } from "./transform";
import type { ProtobufBinaryDecoderOptions } from "./schema";

type Options = ProtobufBinaryDecoderOptions;

const defaultOptions: Options = {"inputMode":"auto","showAlternatives":true,"grpcFrame":false} as Options;

export function ProtobufBinaryDecoderToolView() {
  const [input, setInput] = useState("0a 07 4f 52 44 2d 31 30 32 10 e2 62 1a 0d 0a 04 41 42 31 32 10 02 1d 00 00 48 41 22 06 03 8e 02 9e a7 05");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runProtobufBinaryDecoder(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Input
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.inputMode}
            onChange={(e) => setOptions((o) => ({ ...o, inputMode: e.target.value as Options["inputMode"] }))}
          >
            <option value="auto">{"Auto (hex/base64/PEM)"}</option>
            <option value="hex">{"Hex"}</option>
            <option value="base64">{"Base64"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showAlternatives} onChange={(e) => setOptions((o) => ({ ...o, showAlternatives: e.target.checked }))} />
          Show alternative readings
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.grpcFrame} onChange={(e) => setOptions((o) => ({ ...o, grpcFrame: e.target.checked }))} />
          Strip gRPC 5-byte frame
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Protobuf bytes (hex or base64)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="08 96 01"
                aria-label="Protobuf bytes (hex or base64)"
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
