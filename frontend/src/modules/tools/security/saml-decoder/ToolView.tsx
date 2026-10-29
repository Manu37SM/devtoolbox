"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runSamlDecoder } from "./transform";
import type { SamlDecoderOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

type Options = SamlDecoderOptions;

const defaultOptions: Options = {"output":"both"} as Options;

export function SamlDecoderToolView() {
  const [input, setInput] = useState("<samlp:Response xmlns:samlp=\"urn:oasis:names:tc:SAML:2.0:protocol\" xmlns:saml=\"urn:oasis:names:tc:SAML:2.0:assertion\" ID=\"_r1\" Version=\"2.0\" IssueInstant=\"2024-01-31T10:00:00Z\" Destination=\"https://sp.example.com/acs\" InResponseTo=\"_req42\"><saml:Issuer>https://idp.example.com</saml:Issuer><samlp:Status><samlp:StatusCode Value=\"urn:oasis:names:tc:SAML:2.0:status:Success\"/></samlp:Status><saml:Assertion ID=\"_a1\" Version=\"2.0\" IssueInstant=\"2024-01-31T10:00:00Z\"><saml:Issuer>https://idp.example.com</saml:Issuer><saml:Subject><saml:NameID Format=\"urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress\">ann@example.com</saml:NameID></saml:Subject><saml:Conditions NotBefore=\"2024-01-31T09:59:00Z\" NotOnOrAfter=\"2024-01-31T10:05:00Z\"><saml:AudienceRestriction><saml:Audience>https://sp.example.com</saml:Audience></saml:AudienceRestriction></saml:Conditions><saml:AttributeStatement><saml:Attribute Name=\"groups\"><saml:AttributeValue>admins</saml:AttributeValue></saml:Attribute></saml:AttributeStatement></saml:Assertion></samlp:Response>");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const [result, setResult] = useState<TransformResult>({ output: "", error: null });
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    void runSamlDecoder(input, options).then((next) => {
      if (id === requestId.current) setResult(next);
    });
  }, [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.output}
            onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}
          >
            <option value="both">{"Summary + XML"}</option>
            <option value="summary">{"Summary"}</option>
            <option value="xml">{"XML"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">SAMLResponse / SAMLRequest value, URL or XML</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="PHNhbWxwOlJlc3BvbnNlIC4uLg=="
                aria-label="SAMLResponse / SAMLRequest value, URL or XML"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
