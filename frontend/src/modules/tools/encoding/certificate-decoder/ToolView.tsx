"use client";

import { useMemo, useState } from "react";
import { decodeCertificate } from "./transform";
import { CopyValue, ResultActions, toLines } from "@/components/tools/ResultActions";
import { ToolInput } from "@/components/tools/ToolInput";

const PLACEHOLDER = "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----";

export function CertificateDecoderToolView() {
  const [input, setInput] = useState("");
  const result = useMemo(() => decodeCertificate(input), [input]);

  const fields: Array<readonly [string, string]> = result.info
    ? [
        ["Subject", result.info.subject],
        ["Issuer", result.info.issuer],
        ["Self-signed", result.info.isSelfSigned ? "Yes" : "No"],
        ["Serial number", result.info.serialNumberHex],
        ["Not before", result.info.notBefore],
        ["Not after", result.info.notAfter],
        ["Currently valid", result.info.isCurrentlyValid ? "Yes" : "No (expired or not yet valid)"],
        ["Signature algorithm", result.info.signatureAlgorithm],
        ["Public key algorithm", result.info.publicKeyAlgorithm],
        ["X.509 version", String(result.info.version)],
      ]
    : [];

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 md:grid-cols-2">
      <div className="flex h-full min-h-[260px] flex-col gap-1">
        <span className="text-sm text-text-secondary">PEM certificate (or open a .der/.crt file)</span>
        <ToolInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={PLACEHOLDER}
          className="font-mono text-xs"
          aria-label="PEM certificate input"
        />
      </div>

      <div className="flex h-full flex-col gap-2 overflow-auto">
        {result.error && (
          <div role="alert" className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
            {result.error}
          </div>
        )}

        {result.info && <ResultActions text={toLines(fields)} json={result.info} />}
        {result.info && (
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
        )}

        {!result.info && !result.error && (
          <p className="text-sm text-text-muted">Paste a PEM-encoded certificate to see its decoded fields.</p>
        )}
      </div>
    </div>
  );
}
