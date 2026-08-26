"use client";

import { useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { generateKeyPairPem } from "./transform";
import type { EcCurve, KeyPairType, RsaEcKeyPairOptions, RsaModulusLength } from "./schema";

const defaultOptions: RsaEcKeyPairOptions = { keyType: "rsa", rsaModulusLength: 2048, ecCurve: "P-256" };

export function RsaEcKeyPairGeneratorToolView() {
  const [options, setOptions] = useState<RsaEcKeyPairOptions>(defaultOptions);
  const [publicKeyPem, setPublicKeyPem] = useState("");
  const [privateKeyPem, setPrivateKeyPem] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const patch = (p: Partial<RsaEcKeyPairOptions>) => setOptions((o) => ({ ...o, ...p }));

  async function handleGenerate() {
    setBusy(true);
    setError(null);
    const result = await generateKeyPairPem(options);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      setPublicKeyPem("");
      setPrivateKeyPem("");
    } else {
      setPublicKeyPem(result.publicKeyPem);
      setPrivateKeyPem(result.privateKeyPem);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Key type
          <select
            value={options.keyType}
            onChange={(e) => patch({ keyType: e.target.value as KeyPairType })}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-2"
          >
            <option value="rsa">RSA</option>
            <option value="ec">EC (ECDSA)</option>
          </select>
        </label>

        {options.keyType === "rsa" ? (
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Modulus length
            <select
              value={options.rsaModulusLength}
              onChange={(e) => patch({ rsaModulusLength: Number(e.target.value) as RsaModulusLength })}
              className="rounded-sm border border-border-default bg-bg-raised px-2 py-2"
            >
              <option value={2048}>2048 bit</option>
              <option value={3072}>3072 bit</option>
              <option value={4096}>4096 bit</option>
            </select>
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Curve
            <select
              value={options.ecCurve}
              onChange={(e) => patch({ ecCurve: e.target.value as EcCurve })}
              className="rounded-sm border border-border-default bg-bg-raised px-2 py-2"
            >
              <option value="P-256">P-256</option>
              <option value="P-384">P-384</option>
              <option value="P-521">P-521</option>
            </select>
          </label>
        )}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy}
          className="rounded-sm bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {busy ? "Generating…" : "Generate key pair"}
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
        <div className="min-h-[160px]">
          <OutputPane value={publicKeyPem} label="Public key (SPKI, PEM)" placeholder="Public key will appear here" />
        </div>
        <div className="min-h-[160px]">
          <OutputPane
            value={privateKeyPem}
            label="Private key (PKCS8, PEM)"
            placeholder="Private key will appear here"
          />
        </div>
      </div>

      <p className="text-xs text-text-muted">
        Generated locally in your browser via WebCrypto and never transmitted anywhere — but treat this the same as
        any other key-generation environment: don&apos;t generate production keys on a shared or untrusted machine.
      </p>
    </div>
  );
}
