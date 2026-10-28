"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { generateFancyText } from "./transform";
import type { FancyTextGeneratorOptions } from "./schema";

type Options = FancyTextGeneratorOptions;

const defaultOptions: Options = {"style":"all"} as Options;

export function FancyTextGeneratorToolView() {
  const [input, setInput] = useState("Hello World");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateFancyText(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Style
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.style}
            onChange={(e) => setOptions((o) => ({ ...o, style: e.target.value as Options["style"] }))}
          >
            <option value="all">{"All styles"}</option>
            <option value="bold">{"Bold"}</option>
            <option value="italic">{"Italic"}</option>
            <option value="boldItalic">{"Bold italic"}</option>
            <option value="script">{"Script"}</option>
            <option value="boldScript">{"Bold script"}</option>
            <option value="fraktur">{"Fraktur"}</option>
            <option value="boldFraktur">{"Bold fraktur"}</option>
            <option value="doubleStruck">{"Double-struck"}</option>
            <option value="sans">{"Sans"}</option>
            <option value="sansBold">{"Sans bold"}</option>
            <option value="sansItalic">{"Sans italic"}</option>
            <option value="monospace">{"Monospace"}</option>
            <option value="circled">{"Circled"}</option>
            <option value="fullwidth">{"Full-width"}</option>
            <option value="smallCaps">{"Small caps"}</option>
            <option value="upsideDown">{"Upside down"}</option>
            <option value="strikethrough">{"Strikethrough"}</option>
            <option value="underline">{"Underline"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Text</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hello World"
                aria-label="Text"
                className=""
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
