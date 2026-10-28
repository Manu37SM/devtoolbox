"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runNumberFormatter } from "./transform";
import type { NumberFormatterOptions } from "./schema";

type Options = NumberFormatterOptions;

const defaultOptions: Options = {"locale":"en-IN","style":"decimal","currency":"INR","notation":"standard","compactDisplay":"short","minFraction":0,"maxFraction":3,"grouping":true,"compareLocales":false} as Options;

export function NumberFormatterToolView() {
  const [input, setInput] = useState("1234567.891\n0.256\n98765432100");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runNumberFormatter(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Locale
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.locale}
            onChange={(e) => setOptions((o) => ({ ...o, locale: e.target.value as Options["locale"] }))}
          >
            <option value="en-US">{"en-US"}</option>
            <option value="en-IN">{"en-IN"}</option>
            <option value="en-GB">{"en-GB"}</option>
            <option value="de-DE">{"de-DE"}</option>
            <option value="fr-FR">{"fr-FR"}</option>
            <option value="es-ES">{"es-ES"}</option>
            <option value="pt-BR">{"pt-BR"}</option>
            <option value="ja-JP">{"ja-JP"}</option>
            <option value="zh-CN">{"zh-CN"}</option>
            <option value="ar-EG">{"ar-EG"}</option>
            <option value="ru-RU">{"ru-RU"}</option>
            <option value="hi-IN">{"hi-IN"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Style
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.style}
            onChange={(e) => setOptions((o) => ({ ...o, style: e.target.value as Options["style"] }))}
          >
            <option value="decimal">{"Decimal"}</option>
            <option value="currency">{"Currency"}</option>
            <option value="percent">{"Percent"}</option>
          </select>
        </label>
        {options.style === "currency" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Currency
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.currency}
            onChange={(e) => setOptions((o) => ({ ...o, currency: e.target.value as Options["currency"] }))}
          >
            <option value="USD">{"USD"}</option>
            <option value="EUR">{"EUR"}</option>
            <option value="INR">{"INR"}</option>
            <option value="GBP">{"GBP"}</option>
            <option value="JPY">{"JPY"}</option>
            <option value="CHF">{"CHF"}</option>
            <option value="BRL">{"BRL"}</option>
            <option value="CNY">{"CNY"}</option>
            <option value="AED">{"AED"}</option>
            <option value="AUD">{"AUD"}</option>
            <option value="CAD">{"CAD"}</option>
          </select>
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Notation
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.notation}
            onChange={(e) => setOptions((o) => ({ ...o, notation: e.target.value as Options["notation"] }))}
          >
            <option value="standard">{"Standard"}</option>
            <option value="compact">{"Compact"}</option>
            <option value="scientific">{"Scientific"}</option>
            <option value="engineering">{"Engineering"}</option>
          </select>
        </label>
        {options.notation === "compact" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Compact
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.compactDisplay}
            onChange={(e) => setOptions((o) => ({ ...o, compactDisplay: e.target.value as Options["compactDisplay"] }))}
          >
            <option value="short">{"Short (1.2M)"}</option>
            <option value="long">{"Long (1.2 million)"}</option>
          </select>
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Min decimals
          <input
            type="number"
            min={0} max={20}
            value={options.minFraction}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, minFraction: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Max decimals
          <input
            type="number"
            min={0} max={20}
            value={options.maxFraction}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, maxFraction: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.grouping} onChange={(e) => setOptions((o) => ({ ...o, grouping: e.target.checked }))} />
          Grouping
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.compareLocales} onChange={(e) => setOptions((o) => ({ ...o, compareLocales: e.target.checked }))} />
          Compare all locales
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Numbers (one per line, plain digits)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="1234567.891"
                aria-label="Numbers (one per line, plain digits)"
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
