"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";


import { calcGst } from "./transform";
import type { GstCalculatorOptions } from "./schema";

type Options = GstCalculatorOptions;

const defaultOptions: Options = {"rate":"18","mode":"exclusive","intraState":true} as Options;

export function GstCalculatorToolView() {
  const [input, setInput] = useState("1000\n₹1,499.50");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => calcGst(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          GST rate
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.rate}
            onChange={(e) => setOptions((o) => ({ ...o, rate: e.target.value as Options["rate"] }))}
          >
            <option value="0">{"0%"}</option>
            <option value="0.25">{"0.25%"}</option>
            <option value="3">{"3%"}</option>
            <option value="5">{"5%"}</option>
            <option value="12">{"12%"}</option>
            <option value="18">{"18%"}</option>
            <option value="28">{"28%"}</option>
          </select>
        </label>
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["exclusive","Add GST"],["inclusive","Remove GST"]] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={options.mode === value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, mode: value as Options["mode"] }))}
            >
              {label}
            </Button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.intraState} onChange={(e) => setOptions((o) => ({ ...o, intraState: e.target.checked }))} />
          Intra-state (CGST + SGST)
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Amounts (one per line)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="1000"
                aria-label="Amounts (one per line)"
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
