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
  });
  const [seed, setSeed] = useState(0);

  // Generated only on the client, after mount, to avoid a server/client
  // hydration mismatch: generatePassword() uses crypto.getRandomValues, which
  // returns a different value on every call, including the SSR pass.
  const [result, setResult] = useState<PasswordResult>({ password: "", entropyBits: 0, error: null });
  useEffect(() => {
    setResult(generatePassword(options));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, seed]);
  const strength = strengthLabel(result.entropyBits);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-md border border-border-default bg-bg-raised p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="break-all font-mono text-lg text-text-primary">
            {result.password || "—"}
          </span>
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
      </div>
    </div>
  );
}
