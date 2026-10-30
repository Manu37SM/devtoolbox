"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/tools/CopyButton";
import { generatePassword, type PasswordResult } from "./transform";
import type { PasswordGeneratorOptions } from "./schema";

function strengthLabel(bits: number): { label: string; variant: "danger" | "warning" | "success" } {
  if (bits < 40) return { label: "Weak", variant: "danger" };
  if (bits < 70) return { label: "Reasonable", variant: "warning" };
  return { label: "Strong", variant: "success" };
}

export function PasswordGeneratorToolView() {
  const [options, setOptions] = useState<PasswordGeneratorOptions>({
    length: 20,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeAmbiguous: false,
    excludeChars: "",
    symbolSet: "full",
    requireEach: false,
    count: 1,
  });
  const [seed, setSeed] = useState(0);

  const [result, setResult] = useState<PasswordResult>({ password: "", entropyBits: 0, error: null });
  useEffect(() => {
    setResult(generatePassword(options));

  }, [options, seed]);
  const strength = strengthLabel(result.entropyBits);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-md border border-border-default bg-bg-raised p-4">
        <div className="flex items-center justify-between gap-3">
          {(result.passwords?.length ?? 0) > 1 ? (
            <ol className="flex min-w-0 flex-col gap-1 font-mono text-sm text-text-primary">
              {result.passwords!.map((p, i) => (
                <li key={i} className="break-all">
                  {p}
                </li>
              ))}
            </ol>
          ) : (
            <span className="break-all font-mono text-lg text-text-primary">{result.password || "—"}</span>
          )}
          <div className="flex items-center gap-2">
            <CopyButton value={result.password} />
            <Button variant="secondary" size="sm" onClick={() => setSeed((s) => s + 1)}>
              Regenerate
            </Button>
          </div>
        </div>
        {result.error ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            {result.error}
          </p>
        ) : (
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={strength.variant}>{strength.label}</Badge>
            <span className="text-xs text-text-muted">~{Math.round(result.entropyBits)} bits of entropy</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-3 text-sm text-text-secondary">
          Length: {options.length}
          <input
            type="range"
            min={4}
            max={128}
            value={options.length}
            onChange={(e) => setOptions((o) => ({ ...o, length: Number(e.target.value) }))}
            className="flex-1"
          />
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ["uppercase", "Uppercase (A-Z)"],
              ["lowercase", "Lowercase (a-z)"],
              ["numbers", "Numbers (0-9)"],
              ["symbols", "Symbols (!@#…)"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-1.5 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={options[key]}
                onChange={(e) => setOptions((o) => ({ ...o, [key]: e.target.checked }))}
              />
              {label}
            </label>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.excludeAmbiguous}
            onChange={(e) => setOptions((o) => ({ ...o, excludeAmbiguous: e.target.checked }))}
          />
          Exclude ambiguous characters (Il1O0o)
        </label>
        <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Symbols
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.symbolSet}
            onChange={(e) => setOptions((o) => ({ ...o, symbolSet: e.target.value as PasswordGeneratorOptions["symbolSet"] }))}
          >
            <option value="full">All (!@#$%…)</option>
            <option value="safe">URL/shell-safe (- _ . ~)</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Never use
          <input
            type="text"
            value={options.excludeChars}
            placeholder={"e.g. quotes, $ or \\"}
            onChange={(e) => setOptions((o) => ({ ...o, excludeChars: e.target.value }))}
            className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.requireEach}
            onChange={(e) => setOptions((o) => ({ ...o, requireEach: e.target.checked }))}
          />
          At least one of each type
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          How many
          <input
            type="number"
            min={1}
            max={50}
            value={options.count}
            onChange={(e) => setOptions((o) => ({ ...o, count: Math.min(50, Math.max(1, Number(e.target.value) || 0)) }))}
            className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
        </div>
      </div>
    </div>
  );
}
