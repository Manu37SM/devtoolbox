"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { maskPii } from "./transform";
import type { PiiMaskerOptions } from "./schema";

type Options = PiiMaskerOptions;

const defaultOptions: Options = {"style":"partial","email":true,"phone":true,"card":true,"ssn":true,"ip":true,"idNumbers":true,"iban":true,"report":false} as Options;

export function PiiMaskerToolView() {
  const [input, setInput] = useState("Contact ann.lee@example.com or +1 415-555-2671\nCard 4111 1111 1111 1111, SSN 123-45-6789\nPAN ABCDE1234F, Aadhaar 2345 6789 0123\nClient 192.168.4.77 paid to GB82 WEST 1234 5698 7654 32");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => maskPii(input, options), [input, options]);

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
            <option value="partial">{"Partial (keep last digits)"}</option>
            <option value="label">{"Label ([EMAIL])"}</option>
            <option value="stars">{"All stars"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.email} onChange={(e) => setOptions((o) => ({ ...o, email: e.target.checked }))} />
          Email
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.phone} onChange={(e) => setOptions((o) => ({ ...o, phone: e.target.checked }))} />
          Phone
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.card} onChange={(e) => setOptions((o) => ({ ...o, card: e.target.checked }))} />
          Card
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.ssn} onChange={(e) => setOptions((o) => ({ ...o, ssn: e.target.checked }))} />
          SSN
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.ip} onChange={(e) => setOptions((o) => ({ ...o, ip: e.target.checked }))} />
          IP
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.idNumbers} onChange={(e) => setOptions((o) => ({ ...o, idNumbers: e.target.checked }))} />
          PAN / Aadhaar
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.iban} onChange={(e) => setOptions((o) => ({ ...o, iban: e.target.checked }))} />
          IBAN
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.report} onChange={(e) => setOptions((o) => ({ ...o, report: e.target.checked }))} />
          Add report
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Text to mask</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste logs or records..."
                aria-label="Text to mask"
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
