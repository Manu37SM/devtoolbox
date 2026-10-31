"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { brailleConverter } from "./transform";
import type { BrailleConverterOptions } from "./schema";

type Options = BrailleConverterOptions;

const defaultOptions: Options = {"mode": "encode", "cells": "unicode", "dots": false} as Options;

export function BrailleConverterToolView() {
  const [in0, setIn0] = useState("Hello, World! Call 911 at 5:30.");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => brailleConverter(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Direction"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.mode} onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}>
            <option value={"encode"}>{"Text \u2192 Braille"}</option>
            <option value={"decode"}>{"Braille \u2192 text"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Cells"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.cells} onChange={(e) => setOptions((o) => ({ ...o, cells: e.target.value as Options["cells"] }))}>
            <option value={"unicode"}>{"Unicode \u2813\u2811\u2807\u2807\u2815"}</option>
            <option value={"ascii"}>{"Braille ASCII (BRF)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.dots} onChange={(e) => setOptions((o) => ({ ...o, dots: e.target.checked }))} />
          {"Show dot numbers"}
        </label>
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
                  placeholder={"Hello, World! Call 911 at 5:30."}
                  aria-label={"Input"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Braille"} fileName={"braille.txt"} value={result.output} error={result.error?.message ?? null} placeholder={"Braille will appear here"} />}
        />
      </div>
    </div>
  );
}
