"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { soapEnvelopeBuilder } from "./transform";
import type { SoapEnvelopeBuilderOptions } from "./schema";

type Options = SoapEnvelopeBuilderOptions;

const defaultOptions: Options = {"mode": "build", "version": "1.1", "namespace": "http://example.com/service", "prefix": "ns", "childForm": "unqualified", "soapAction": "", "security": "none", "username": "", "password": "", "nonce": "", "created": "", "mustUnderstand": true, "headers": "", "indent": 2, "xmlDeclaration": true, "output": "envelope", "endpoint": "https://example.com/service"} as Options;

export function SoapEnvelopeBuilderToolView() {
  const [in0, setIn0] = useState("{\n  \"GetQuote\": {\n    \"symbol\": \"ACME\",\n    \"@_currency\": \"USD\"\n  }\n}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => soapEnvelopeBuilder(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Mode"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.mode} onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}>
            <option value={"build"}>{"Build request"}</option>
            <option value={"fault"}>{"Build fault"}</option>
            <option value={"parse"}>{"Parse SOAP \u2192 JSON"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"SOAP"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.version} onChange={(e) => setOptions((o) => ({ ...o, version: e.target.value as Options["version"] }))}>
            <option value={"1.1"}>{"1.1"}</option>
            <option value={"1.2"}>{"1.2"}</option>
          </select>
        </label>
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Namespace URI"}
          <input type="text" value={options.namespace} placeholder={"http://example.com/service"} onChange={(e) => setOptions((o) => ({ ...o, namespace: e.target.value }))} className="w-60 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Prefix"}
          <input type="text" value={options.prefix} placeholder={"ns"} onChange={(e) => setOptions((o) => ({ ...o, prefix: e.target.value }))} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Child elements"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.childForm} onChange={(e) => setOptions((o) => ({ ...o, childForm: e.target.value as Options["childForm"] }))}>
            <option value={"unqualified"}>{"Unqualified"}</option>
            <option value={"qualified"}>{"Qualified (same namespace)"}</option>
          </select>
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"SOAPAction"}
          <input type="text" value={options.soapAction} placeholder={"urn:GetQuote"} onChange={(e) => setOptions((o) => ({ ...o, soapAction: e.target.value }))} className="w-44 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"WS-Security"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.security} onChange={(e) => setOptions((o) => ({ ...o, security: e.target.value as Options["security"] }))}>
            <option value={"none"}>{"None"}</option>
            <option value={"text"}>{"UsernameToken (text)"}</option>
            <option value={"digest"}>{"UsernameToken (digest)"}</option>
          </select>
        </label>
        )}
        {["text", "digest"].includes(String(options.security)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Username"}
          <input type="text" value={options.username} placeholder={""} onChange={(e) => setOptions((o) => ({ ...o, username: e.target.value }))} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["text", "digest"].includes(String(options.security)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Password"}
          <input type="text" value={options.password} placeholder={""} onChange={(e) => setOptions((o) => ({ ...o, password: e.target.value }))} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["digest"].includes(String(options.security)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Nonce (base64, blank = example)"}
          <input type="text" value={options.nonce} placeholder={""} onChange={(e) => setOptions((o) => ({ ...o, nonce: e.target.value }))} className="w-44 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["digest"].includes(String(options.security)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Created (blank = now)"}
          <input type="text" value={options.created} placeholder={"2026-01-01T00:00:00Z"} onChange={(e) => setOptions((o) => ({ ...o, created: e.target.value }))} className="w-48 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["text", "digest"].includes(String(options.security)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.mustUnderstand} onChange={(e) => setOptions((o) => ({ ...o, mustUnderstand: e.target.checked }))} />
          {"mustUnderstand"}
        </label>
        )}
        {["build"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Extra headers (JSON)"}
          <input type="text" value={options.headers} placeholder={"{\"TraceId\":\"abc\"}"} onChange={(e) => setOptions((o) => ({ ...o, headers: e.target.value }))} className="w-56 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["build", "fault"].includes(String(options.mode)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Output"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.output} onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}>
            <option value={"envelope"}>{"Envelope"}</option>
            <option value={"http"}>{"HTTP request"}</option>
            <option value={"curl"}>{"curl command"}</option>
          </select>
        </label>
        )}
        {["http", "curl"].includes(String(options.output)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Endpoint"}
          <input type="text" value={options.endpoint} placeholder={"https://example.com/service"} onChange={(e) => setOptions((o) => ({ ...o, endpoint: e.target.value }))} className="w-60 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Indent"}
          <input type="number" min={0} max={8} value={options.indent} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, indent: Math.min(8, Math.max(0, n)) })); }} className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.xmlDeclaration} onChange={(e) => setOptions((o) => ({ ...o, xmlDeclaration: e.target.checked }))} />
          {"XML declaration"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Body (JSON) / SOAP XML"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"JSON: {\"Operation\": {\"param\": \"value\"}}  \u00b7  fault: {\"code\": \"Server\", \"reason\": \"...\"}  \u00b7  parse: paste SOAP XML"}
                  aria-label={"Body (JSON) / SOAP XML"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"SOAP message"} fileName={"soap.xml"} value={result.output} error={result.error?.message ?? null} placeholder={"Output appears here"} />}
        />
      </div>
    </div>
  );
}
