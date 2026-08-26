"use client";

import { useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { hashOrVerify } from "./transform";
import type { BcryptArgon2Algorithm, BcryptArgon2Mode, BcryptArgon2Options } from "./schema";

const defaultOptions: BcryptArgon2Options = {
  algorithm: "bcrypt",
  mode: "hash",
  password: "",
  existingHash: "",
  bcryptCost: 10,
  argon2Iterations: 2,
  argon2MemoryKib: 19456,
  argon2Parallelism: 1,
};

export function BcryptArgon2HashVerifyToolView() {
  const [options, setOptions] = useState<BcryptArgon2Options>(defaultOptions);
  const [output, setOutput] = useState("");
  const [verified, setVerified] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const patch = (p: Partial<BcryptArgon2Options>) => setOptions((o) => ({ ...o, ...p }));

  async function handleRun() {
    setBusy(true);
    setError(null);
    const result = await hashOrVerify(options);
    setBusy(false);
    setOutput(result.output);
    setVerified(result.verified);
    setError(result.error?.message ?? null);
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Algorithm
          <select
            value={options.algorithm}
            onChange={(e) => patch({ algorithm: e.target.value as BcryptArgon2Algorithm })}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-2"
          >
            <option value="bcrypt">bcrypt</option>
            <option value="argon2id">Argon2id</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Mode
          <select
            value={options.mode}
            onChange={(e) => patch({ mode: e.target.value as BcryptArgon2Mode })}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-2"
          >
            <option value="hash">Hash</option>
            <option value="verify">Verify</option>
          </select>
        </label>

        {options.algorithm === "bcrypt" && options.mode === "hash" && (
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Cost factor
            <input
              type="number"
              min={4}
              max={15}
              value={options.bcryptCost}
              onChange={(e) => patch({ bcryptCost: Number(e.target.value) })}
              className="w-20 rounded-sm border border-border-default bg-bg-raised px-2 py-2 font-mono text-sm"
              aria-label="bcrypt cost factor"
            />
          </label>
        )}

        {options.algorithm === "argon2id" && options.mode === "hash" && (
          <>
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Iterations
              <input
                type="number"
                min={1}
                max={10}
                value={options.argon2Iterations}
                onChange={(e) => patch({ argon2Iterations: Number(e.target.value) })}
                className="w-20 rounded-sm border border-border-default bg-bg-raised px-2 py-2 font-mono text-sm"
                aria-label="Argon2 iterations"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-text-secondary">
              Memory (KiB)
              <input
                type="number"
                min={8}
                max={262144}
                value={options.argon2MemoryKib}
                onChange={(e) => patch({ argon2MemoryKib: Number(e.target.value) })}
                className="w-28 rounded-sm border border-border-default bg-bg-raised px-2 py-2 font-mono text-sm"
                aria-label="Argon2 memory in KiB"
              />
            </label>
          </>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm text-text-secondary">
        Password
        <input
          type="text"
          value={options.password}
          onChange={(e) => patch({ password: e.target.value })}
          className="w-full rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm"
          aria-label="Password"
        />
      </label>

      {options.mode === "verify" && (
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Existing hash
          <input
            value={options.existingHash ?? ""}
            onChange={(e) => patch({ existingHash: e.target.value })}
            className="w-full rounded-sm border border-border-default bg-bg-raised px-3 py-2 font-mono text-sm"
            aria-label="Existing hash to verify against"
          />
        </label>
      )}

      <button
        type="button"
        onClick={handleRun}
        disabled={busy || options.password.length === 0}
        className="w-fit rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {busy ? "Working…" : options.mode === "hash" ? "Generate hash" : "Verify"}
      </button>

      {options.mode === "verify" && verified !== null && (
        <div
          role="status"
          className={`rounded-md border p-3 text-sm ${
            verified ? "border-success/40 bg-success/5 text-success" : "border-danger/40 bg-danger/5 text-danger"
          }`}
        >
          {verified ? "✓ Password matches the hash." : "✗ Password does not match the hash."}
        </div>
      )}

      {options.mode === "hash" && (
        <div className="min-h-[80px]">
          <OutputPane
            value={output}
            error={error}
            label={`${options.algorithm} hash`}
            placeholder="Generated hash will appear here"
          />
        </div>
      )}

      {options.mode === "verify" && error && (
        <div role="alert" className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      )}
    </div>
  );
}
