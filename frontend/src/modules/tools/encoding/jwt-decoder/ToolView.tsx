"use client";

import { useMemo, useState } from "react";
import { DualPane } from "@/components/tools/DualPane";
import { Badge } from "@/components/ui/badge";
import { ToolInput } from "@/components/tools/ToolInput";
import { decodeJwt, type JwtCheck } from "./transform";
import { jwtDecoderOptionsSchema, type JwtDecoderOptions } from "./schema";
import { CopyValue, ResultActions } from "@/components/tools/ResultActions";

const CLS_COL = "flex flex-col gap-1 text-xs text-text-secondary";
const CLS_INPUT = "rounded-sm border border-border-default bg-bg-base px-2 py-1 text-sm";
const STATUS_STYLE: Record<JwtCheck["status"], string> = {
  pass: "text-success",
  fail: "text-danger",
  warn: "text-warning",
  info: "text-text-muted",
};
const STATUS_ICON: Record<JwtCheck["status"], string> = { pass: "✓", fail: "✗", warn: "!", info: "•" };

export function JwtDecoderToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<JwtDecoderOptions>(() => ({ ...jwtDecoderOptionsSchema.parse({}), verifySecret: "" }));
  const set = <K extends keyof JwtDecoderOptions>(k: K, v: JwtDecoderOptions[K]) => setOptions((o) => ({ ...o, [k]: v }));
  const result = useMemo(() => decodeJwt(input, options), [input, options]);
  const alg = String(result.header?.alg ?? "");
  const isHmac = /^HS/.test(alg);

  return (
    <div className="min-h-0 flex-1">
      <DualPane
        input={
          <div className="flex h-full flex-col gap-2">
            <label className="text-sm font-medium text-text-secondary">Token</label>
            <div className="min-h-[120px] flex-1">
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="eyJhbGciOi... (an Authorization: Bearer header works too)"
                aria-label="JWT input"
              />
            </div>
            <details className="rounded-md border border-border-subtle bg-bg-raised p-2 text-sm" open={Boolean(options.verifySecret || options.publicKey)}>
              <summary className="cursor-pointer text-text-secondary">Verify signature &amp; claims</summary>
              <div className="mt-2 flex flex-col gap-2">
                {(isHmac || !alg) && (
                  <label className={CLS_COL}>
                    HMAC secret (HS256/384/512)
                    <div className="flex gap-2">
                      <input
                        type="password"
                        autoComplete="off"
                        value={options.verifySecret ?? ""}
                        onChange={(e) => set("verifySecret", e.target.value)}
                        className={`${CLS_INPUT} flex-1`}
                        aria-label="HMAC secret"
                      />
                      <select
                        className={CLS_INPUT}
                        value={options.secretEncoding}
                        onChange={(e) => set("secretEncoding", e.target.value as JwtDecoderOptions["secretEncoding"])}
                        aria-label="Secret encoding"
                      >
                        <option value="utf8">Text</option>
                        <option value="base64">Base64</option>
                        <option value="base64url">Base64url</option>
                        <option value="hex">Hex</option>
                      </select>
                    </div>
                  </label>
                )}
                {!isHmac && (
                  <label className={CLS_COL}>
                    Public key (RS/PS/ES): PEM, certificate, JWK or JWKS
                    <textarea
                      rows={3}
                      value={options.publicKey}
                      onChange={(e) => set("publicKey", e.target.value)}
                      placeholder={"-----BEGIN PUBLIC KEY-----\n…  or  {\"keys\":[…]}"}
                      className={`${CLS_INPUT} font-mono text-xs`}
                      aria-label="Public key"
                    />
                  </label>
                )}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <label className={CLS_COL}>
                    Expected issuer
                    <input value={options.expectedIssuer} onChange={(e) => set("expectedIssuer", e.target.value)} className={CLS_INPUT} />
                  </label>
                  <label className={CLS_COL}>
                    Expected audience
                    <input value={options.expectedAudience} onChange={(e) => set("expectedAudience", e.target.value)} className={CLS_INPUT} />
                  </label>
                  <label className={CLS_COL}>
                    Clock leeway (s)
                    <input
                      type="number"
                      min={0}
                      max={86400}
                      value={options.leewaySeconds}
                      onChange={(e) => set("leewaySeconds", Math.min(86400, Math.max(0, Number(e.target.value) || 0)))}
                      className={CLS_INPUT}
                    />
                  </label>
                </div>
                <p className="text-xs text-text-muted">Keys and secrets stay in your browser. Prefer test keys over production secrets.</p>
              </div>
            </details>
          </div>
        }
        output={
          <div className="flex h-full flex-col gap-3 overflow-auto">
            {result.error ? (
              <div role="alert" className="rounded-md border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
                {result.error}
              </div>
            ) : result.header ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {result.isExpired !== null && (
                    <Badge variant={result.isExpired ? "danger" : "success"} className="w-fit">
                      {result.isExpired ? "Expired" : "Valid (not expired)"}
                    </Badge>
                  )}
                  {result.verification && (
                    <Badge variant={result.verification.status === "valid" ? "success" : "danger"} className="w-fit">
                      {result.verification.status === "valid" ? "Signature verified" : result.verification.status === "invalid" ? "Signature invalid" : "Can't verify"}
                    </Badge>
                  )}
                </div>
                {result.verification && result.verification.status !== "valid" && (
                  <p className="text-xs text-danger">{result.verification.detail}</p>
                )}
                {result.checks && result.checks.length > 0 && (
                  <ul className="flex flex-col gap-1 rounded-md border border-border-subtle bg-bg-raised p-2 text-sm">
                    {result.checks.map((c) => (
                      <li key={c.label} className="flex gap-2">
                        <span className={`w-4 text-center font-bold ${STATUS_STYLE[c.status]}`} aria-label={c.status}>
                          {STATUS_ICON[c.status]}
                        </span>
                        <span className="text-text-secondary">{c.label}:</span>
                        <span className="text-text-primary">{c.detail}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <section>
                  <div className="mb-1 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-text-secondary">Header</h2>
                    <CopyValue value={JSON.stringify(result.header, null, 2)} label="header JSON" />
                  </div>
                  <pre className="overflow-auto rounded-md border border-border-default bg-bg-raised p-3 font-mono text-sm">
                    {JSON.stringify(result.header, null, 2)}
                  </pre>
                </section>
                {result.payload && (
                  <section>
                    <div className="mb-1 flex items-center justify-between">
                      <h2 className="text-sm font-medium text-text-secondary">Payload</h2>
                      <CopyValue value={JSON.stringify(result.payload, null, 2)} label="payload JSON" />
                    </div>
                    <pre className="overflow-auto rounded-md border border-border-default bg-bg-raised p-3 font-mono text-sm">
                      {JSON.stringify(result.payload, null, 2)}
                    </pre>
                  </section>
                )}
                <section>
                  <div className="mb-1 flex items-center justify-between">
                    <h2 className="text-sm font-medium text-text-secondary">Signature</h2>
                    <CopyValue value={result.signature ?? ""} label="signature" />
                  </div>
                  <pre className="overflow-auto rounded-md border border-border-default bg-bg-raised p-3 font-mono text-xs break-all">
                    {result.signature}
                  </pre>
                </section>
                <ResultActions
                  text={JSON.stringify({ header: result.header, payload: result.payload }, null, 2)}
                  json={{ header: result.header, payload: result.payload, signature: result.signature }}
                  fileName="jwt-decoded.json"
                />
              </>
            ) : (
              <p className="text-sm text-text-muted">Paste a JWT to decode it.</p>
            )}
          </div>
        }
      />
    </div>
  );
}
