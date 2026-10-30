"use client";

import { useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { generateKeyPairPem } from "./transform";
import {
  rsaEcKeyPairOptionsSchema,
  type EcCurve,
  type KeyFormat,
  type KeyPairType,
  type RsaEcKeyPairOptions,
  type RsaModulusLength,
} from "./schema";

const defaultOptions: RsaEcKeyPairOptions = rsaEcKeyPairOptionsSchema.parse({});

const PUBLIC_LABEL: Record<KeyFormat, string> = {
  pem: "Public key (SPKI, PEM)",
  traditional: "Public key (PKCS#1 / SPKI)",
  jwk: "Public JWK",
  openssh: "Public key (OpenSSH, authorized_keys)",
};
const PRIVATE_LABEL: Record<KeyFormat, string> = {
  pem: "Private key (PKCS#8, PEM)",
  traditional: "Private key (PKCS#1 / SEC1)",
  jwk: "Private JWK",
  openssh: "Private key (PKCS#8, PEM)",
};

export function RsaEcKeyPairGeneratorToolView() {
  const [options, setOptions] = useState<RsaEcKeyPairOptions>(defaultOptions);
  const [publicKeyPem, setPublicKeyPem] = useState("");
  const [privateKeyPem, setPrivateKeyPem] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<{ fingerprint?: string; kid?: string; note?: string }>({});
  const [shownFormat, setShownFormat] = useState<KeyFormat>("pem");

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
      setMeta({ fingerprint: result.fingerprint, kid: result.kid, note: result.note });
      setShownFormat(options.format);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Key type
          <select
            value={options.keyType}
            onChange={(e) => {
              const keyType = e.target.value as KeyPairType;
              patch(keyType === "ed25519" ? { keyType, use: "sig" } : { keyType });
            }}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-2"
          >
            <option value="rsa">RSA</option>
            <option value="ec">EC (ECDSA / ECDH)</option>
            <option value="ed25519">Ed25519</option>
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
        ) : options.keyType === "ec" ? (
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
        ) : null}

        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Format
          <select
            value={options.format}
            onChange={(e) => patch({ format: e.target.value as KeyFormat })}
            className="rounded-sm border border-border-default bg-bg-raised px-2 py-2"
          >
            <option value="pem">PEM — PKCS#8 / SPKI</option>
            <option value="traditional">PEM — PKCS#1 / SEC1 (legacy)</option>
            <option value="jwk">JWK (JSON)</option>
            <option value="openssh">OpenSSH public key</option>
          </select>
        </label>
        {options.keyType !== "ed25519" && (
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Use
            <select
              value={options.use}
              onChange={(e) => patch({ use: e.target.value as RsaEcKeyPairOptions["use"] })}
              className="rounded-sm border border-border-default bg-bg-raised px-2 py-2"
            >
              <option value="sig">Signing (RS256 / ES256)</option>
              <option value="enc">Encryption ({options.keyType === "rsa" ? "RSA-OAEP" : "ECDH"})</option>
            </select>
          </label>
        )}
        {options.format === "openssh" && (
          <label className="flex flex-col gap-1 text-sm text-text-secondary">
            Comment
            <input
              value={options.comment}
              onChange={(e) => patch({ comment: e.target.value })}
              placeholder="user@host"
              className="w-40 rounded-sm border border-border-default bg-bg-raised px-2 py-2 text-sm"
            />
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
          <OutputPane value={publicKeyPem} label={PUBLIC_LABEL[shownFormat]} placeholder="Public key will appear here" />
        </div>
        <div className="min-h-[160px]">
          <OutputPane
            value={privateKeyPem}
            label={PRIVATE_LABEL[shownFormat]}
            placeholder="Private key will appear here"
          />
        </div>
      </div>

      {publicKeyPem && (
        <div className="flex flex-col gap-1 font-mono text-xs text-text-secondary">
          {meta.fingerprint && <span>Fingerprint: {meta.fingerprint}</span>}
          {meta.kid && <span>JWK thumbprint (kid): {meta.kid}</span>}
          {meta.note && <span className="font-sans text-text-muted">{meta.note}</span>}
        </div>
      )}

      <p className="text-xs text-text-muted">
        Generated locally in your browser via WebCrypto and never transmitted anywhere — but treat this the same as
        any other key-generation environment: don&apos;t generate production keys on a shared or untrusted machine.
      </p>
    </div>
  );
}
