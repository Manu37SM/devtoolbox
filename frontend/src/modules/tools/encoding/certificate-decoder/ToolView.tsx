"use client";

import { useMemo, useState } from "react";
import { decodeCertificate, type CertificateInfo } from "./transform";
import { certificateDecoderOptionsSchema, type CertificateDecoderOptions } from "./schema";
import { CopyValue, ResultActions, toLines } from "@/components/tools/ResultActions";
import { ToolInput } from "@/components/tools/ToolInput";

const PLACEHOLDER = "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----\n(paste several to check a chain)";
const CLS_LABEL = "flex items-center gap-1.5 text-sm text-text-secondary";
const CLS_SELECT = "rounded-sm border border-border-default bg-bg-raised px-1.5 py-1";

function fieldsOf(info: CertificateInfo): Array<readonly [string, string]> {
  const rows: Array<readonly [string, string]> = [
    ["Subject", info.subject],
    ["Issuer", info.issuer],
    ["Subject Alternative Names", info.subjectAltNames?.join(", ") || "—"],
    ["Self-signed", info.isSelfSigned ? "Yes" : "No"],
    ["Certificate authority", info.isCA ? "Yes (CA:TRUE)" : "No"],
    ["Serial number", info.serialNumberHex],
    ["Not before", info.notBefore],
    ["Not after", `${info.notAfter}${info.daysRemaining !== undefined ? ` (${info.daysRemaining} days left)` : ""}`],
    ["Currently valid", info.isCurrentlyValid ? "Yes" : "No (expired or not yet valid)"],
    ["Signature algorithm", info.signatureAlgorithm],
    ["Public key", `${info.publicKeyAlgorithm}${info.keySize ? `, ${info.keySize} bit` : ""}`],
    ["Key usage", info.keyUsage?.join(", ") || "—"],
    ["Extended key usage", info.extendedKeyUsage?.join(", ") || "—"],
    ["SHA-256 fingerprint", info.sha256Fingerprint ?? ""],
    ["SHA-1 fingerprint", info.sha1Fingerprint ?? ""],
    ["X.509 version", String(info.version)],
  ];
  if (info.signedByNext !== undefined) {
    rows.push(["Signed by next certificate", info.signedByNext === null ? "Could not verify" : info.signedByNext ? "Yes" : "No"]);
  }
  return rows;
}

function CertCard({ info, title }: { info: CertificateInfo; title?: string }) {
  const fields = fieldsOf(info);
  return (
    <section className="flex flex-col gap-2">
      {title && <h3 className="text-sm font-medium text-text-secondary">{title}</h3>}
      {info.warnings && info.warnings.length > 0 && (
        <ul className="list-disc rounded-md border border-warning/40 bg-warning/5 py-2 pl-7 pr-3 text-xs text-warning">
          {info.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
      <ResultActions text={toLines(fields)} json={info} />
      <dl className="grid grid-cols-1 gap-2 text-sm">
        {fields.map(([label, value]) => (
          <div key={label} className="rounded-md border border-border-subtle bg-bg-raised px-3 py-2">
            <dt className="text-xs text-text-muted">{label}</dt>
            <dd className="flex items-start justify-between gap-2 break-all font-mono text-sm text-text-primary">
              <span>{value}</span>
              <CopyValue value={value} label={label} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function CertificateDecoderToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<CertificateDecoderOptions>(() => certificateDecoderOptionsSchema.parse({}));
  const result = useMemo(() => decodeCertificate(input, options), [input, options]);
  const certs = result.chain ?? (result.info ? [result.info] : []);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className={CLS_LABEL}>
          Names as
          <select
            className={CLS_SELECT}
            value={options.dnStyle}
            onChange={(e) => setOptions((o) => ({ ...o, dnStyle: e.target.value as CertificateDecoderOptions["dnStyle"] }))}
          >
            <option value="openssl">/C=US/O=Org/CN=host</option>
            <option value="rfc2253">CN=host,O=Org,C=US (RFC 2253, Java)</option>
          </select>
        </label>
        <label className={CLS_LABEL}>
          Fingerprints
          <select
            className={CLS_SELECT}
            value={options.fingerprintStyle}
            onChange={(e) =>
              setOptions((o) => ({ ...o, fingerprintStyle: e.target.value as CertificateDecoderOptions["fingerprintStyle"] }))
            }
          >
            <option value="colon">AA:BB:CC</option>
            <option value="hex">aabbcc</option>
          </select>
        </label>
        <label className={CLS_LABEL}>
          Warn when expiring within
          <input
            type="number"
            min={0}
            max={3650}
            value={options.expiryWarningDays}
            onChange={(e) =>
              setOptions((o) => ({ ...o, expiryWarningDays: Math.min(3650, Math.max(0, Number(e.target.value) || 0)) }))
            }
            className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
          days
        </label>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex h-full min-h-[260px] flex-col gap-1">
          <span className="text-sm text-text-secondary">PEM certificate or chain (or open a .der/.crt file)</span>
          <ToolInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={PLACEHOLDER}
            className="font-mono text-xs"
            aria-label="PEM certificate input"
          />
        </div>

        <div className="flex h-full flex-col gap-4 overflow-auto">
          {result.error && (
            <div role="alert" className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
              {result.error}
            </div>
          )}
          {certs.map((c, i) => (
            <CertCard
              key={`${c.serialNumberHex}-${i}`}
              info={c}
              title={certs.length > 1 ? `Certificate ${i + 1}${i === 0 ? " (leaf)" : c.isSelfSigned ? " (root)" : " (intermediate)"}` : undefined}
            />
          ))}
          {!result.info && !result.error && (
            <p className="text-sm text-text-muted">Paste a PEM-encoded certificate to see its decoded fields.</p>
          )}
        </div>
      </div>
    </div>
  );
}
