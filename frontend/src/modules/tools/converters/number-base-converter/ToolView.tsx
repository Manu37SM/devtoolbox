"use client";

import { useMemo, useState } from "react";
import { convertNumberBase } from "./transform";
import { numberBaseOptionsSchema, type NumberBase, type NumberBaseOptions } from "./schema";
import { CopyButton } from "@/components/tools/CopyButton";

const BASES: { value: NumberBase; label: string; key: "binary" | "octal" | "decimal" | "hex" }[] = [
  { value: 2, label: "Binary", key: "binary" },
  { value: 8, label: "Octal", key: "octal" },
  { value: 10, label: "Decimal", key: "decimal" },
  { value: 16, label: "Hexadecimal", key: "hex" },
];

export function NumberBaseConverterToolView() {
  const [input, setInput] = useState("255");
  const [fromBase, setFromBase] = useState<NumberBase>(10);
  const [options, setOptions] = useState<NumberBaseOptions>(() => numberBaseOptionsSchema.parse({}));

  const result = useMemo(() => convertNumberBase(input, fromBase, options), [input, fromBase, options]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-64 rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm"
          aria-label="Number input"
        />
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          from base
          <select
            value={fromBase}
            onChange={(e) => setFromBase(Number(e.target.value) as NumberBase)}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-1.5"
          >
            {BASES.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label} ({b.value})
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Bit width
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.bitWidth}
            onChange={(e) => setOptions((o) => ({ ...o, bitWidth: e.target.value as NumberBaseOptions["bitWidth"] }))}
          >
            <option value="none">Unbounded</option>
            <option value="8">8-bit</option>
            <option value="16">16-bit</option>
            <option value="32">32-bit</option>
            <option value="64">64-bit</option>
            <option value="128">128-bit</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.grouping}
            onChange={(e) => setOptions((o) => ({ ...o, grouping: e.target.checked }))}
          />
          Group digits
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.uppercase}
            onChange={(e) => setOptions((o) => ({ ...o, uppercase: e.target.checked }))}
          />
          Uppercase hex
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.prefixes}
            onChange={(e) => setOptions((o) => ({ ...o, prefixes: e.target.checked }))}
          />
          0x / 0b / 0o prefixes
        </label>
      </div>
      {result.error ? (
        <div role="alert" className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
          {result.error}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {BASES.map((b) => (
            <div
              key={b.value}
              className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-raised px-3 py-2"
            >
              <div>
                <div className="text-xs text-text-muted">{b.label}</div>
                <div className="break-all font-mono text-sm text-text-primary">{result[b.key]}</div>
              </div>
              <CopyButton value={result[b.key]} />
            </div>
          ))}
          {result.signed !== undefined && (
            <div className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-raised px-3 py-2 sm:col-span-2">
              <div>
                <div className="text-xs text-text-muted">Signed (two&apos;s complement, {options.bitWidth}-bit)</div>
                <div className="break-all font-mono text-sm text-text-primary">{result.signed}</div>
              </div>
              <CopyButton value={result.signed} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
