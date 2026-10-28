"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { convertBase58 } from "./transform";
import type { Base58Base62ConverterOptions } from "./schema";

type Options = Base58Base62ConverterOptions;

const defaultOptions: Options = {"direction":"encode","alphabet":"base58","binaryFormat":"text"} as Options;

export function Base58Base62ConverterToolView() {
  const [input, setInput] = useState("Hello World!");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertBase58(input, options), [input, options]);

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
            <option value="encode">{"Encode"}</option>
            <option value="decode">{"Decode"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Alphabet
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.alphabet}
            onChange={(e) => setOptions((o) => ({ ...o, alphabet: e.target.value as Options["alphabet"] }))}
          >
            <option value="base58">{"Base58 (Bitcoin)"}</option>
            <option value="flickr">{"Base58 (Flickr)"}</option>
            <option value="ripple">{"Base58 (Ripple)"}</option>
            <option value="base62">{"Base62"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Bytes as
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.binaryFormat}
            onChange={(e) => setOptions((o) => ({ ...o, binaryFormat: e.target.value as Options["binaryFormat"] }))}
          >
            <option value="text">{"UTF-8 text"}</option>
            <option value="hex">{"Hex"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hello World!"
                aria-label="Input"
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
