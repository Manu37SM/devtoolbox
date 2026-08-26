"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/tools/CopyButton";
import { generateTotp } from "./transform";
import type { TotpAlgorithm, TotpGeneratorOptions } from "./schema";

const defaultOptions: TotpGeneratorOptions = {
  secret: "JBSWY3DPEHPK3PXP",
  digits: 6,
  period: 30,
  algorithm: "SHA-1",
};

export function TotpGeneratorToolView() {
  const [options, setOptions] = useState<TotpGeneratorOptions>(defaultOptions);
  const [code, setCode] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const patch = (p: Partial<TotpGeneratorOptions>) => setOptions((o) => ({ ...o, ...p }));

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      const result = await generateTotp(options);
      if (cancelled) return;
      setCode(result.code);
      setSecondsRemaining(result.secondsRemaining);
      setError(result.error);
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [options]);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Base32 secret
          <input
            value={options.secret}
            onChange={(e) => patch({ secret: e.target.value })}
            className="w-64 rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm"
            aria-label="Base32 secret"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Digits
          <select
            value={options.digits}
            onChange={(e) => patch({ digits: Number(e.target.value) as 6 | 8 })}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-2"
          >
            <option value={6}>6</option>
            <option value={8}>8</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Period (s)
          <input
            type="number"
            min={15}
            max={120}
            value={options.period}
            onChange={(e) => patch({ period: Number(e.target.value) })}
            className="w-20 rounded-sm border border-border-default bg-bg-raised px-2 py-2 font-mono text-sm"
            aria-label="Period in seconds"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Algorithm
          <select
            value={options.algorithm}
            onChange={(e) => patch({ algorithm: e.target.value as TotpAlgorithm })}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-2"
          >
            <option value="SHA-1">SHA-1</option>
            <option value="SHA-256">SHA-256</option>
            <option value="SHA-512">SHA-512</option>
          </select>
        </label>
      </div>

      {error ? (
        <div role="alert" className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-raised px-4 py-3">
          <div>
            <div className="text-xs text-text-muted">Current code · refreshes in {secondsRemaining}s</div>
            <div className="font-mono text-3xl tracking-widest text-text-primary">{code}</div>
          </div>
          <CopyButton value={code} />
        </div>
      )}

      <p className="text-xs text-text-muted">
        This generates codes locally for testing 2FA flows during development — nothing is transmitted anywhere.
      </p>
    </div>
  );
}
