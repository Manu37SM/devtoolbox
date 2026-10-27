"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { checkLuhn } from "./transform";
import type { LuhnValidatorOptions } from "./schema";

type Options = LuhnValidatorOptions;

const defaultOptions: Options = {"mode":"validate","mask":true,"brand":"visa","count":3} as Options;

export function LuhnValidatorToolView() {
  const [input, setInput] = useState("4111 1111 1111 1111");
  const [options, setOptions] = useState<Options>(defaultOptions);
  const [nonce, setNonce] = useState(0);

  const result = useMemo(() => checkLuhn(input, options, nonce), [input, options, nonce]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap overflow-hidden rounded-sm border border-border-default">
          {([["validate","Validate"],["generate","Generate test numbers"]] as const).map(([value, label]) => (
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
        {options.mode === "validate" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.mask} onChange={(e) => setOptions((o) => ({ ...o, mask: e.target.checked }))} />
          Mask digits
        </label>
        )}
        {options.mode === "generate" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Network
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.brand}
            onChange={(e) => setOptions((o) => ({ ...o, brand: e.target.value as Options["brand"] }))}
          >
            <option value="visa">{"Visa"}</option>
            <option value="mastercard">{"Mastercard"}</option>
            <option value="amex">{"American Express"}</option>
            <option value="discover">{"Discover"}</option>
            <option value="diners">{"Diners Club"}</option>
            <option value="jcb">{"JCB"}</option>
            <option value="unionpay">{"UnionPay"}</option>
            <option value="rupay">{"RuPay"}</option>
          </select>
        </label>
        )}
        {options.mode === "generate" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Count
          <input
            type="number"
            min={1} max={50}
            value={options.count}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, count: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        )}
        <Button variant="ghost" size="sm" onClick={() => setNonce((n) => n + 1)}>
          Regenerate
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Numbers to check (one per line) — do not paste real card numbers</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder=""
                aria-label="Numbers to check (one per line) — do not paste real card numbers"
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
