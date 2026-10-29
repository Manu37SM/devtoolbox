"use client";

import { useEffect, useRef, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runWebhookSignatureVerifier } from "./transform";
import type { WebhookSignatureVerifierOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

type Options = WebhookSignatureVerifierOptions;

const defaultOptions: Options = {"provider":"github","algorithm":"sha256","encoding":"hex"} as Options;

export function WebhookSignatureVerifierToolView() {
  const [input, setInput] = useState("secret: s3cr3t\nsignature: sha256=30a0e9eb0494322da64dc32c39c63a3bb2ad4759995e892442cf6aa5a9d3c26e\n\n{\"id\":\"evt_1\",\"amount\":12550}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const [result, setResult] = useState<TransformResult>({ output: "", error: null });
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    void runWebhookSignatureVerifier(input, options).then((next) => {
      if (id === requestId.current) setResult(next);
    });
  }, [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Provider
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.provider}
            onChange={(e) => setOptions((o) => ({ ...o, provider: e.target.value as Options["provider"] }))}
          >
            <option value="github">{"GitHub"}</option>
            <option value="stripe">{"Stripe"}</option>
            <option value="slack">{"Slack"}</option>
            <option value="razorpay">{"Razorpay"}</option>
            <option value="shopify">{"Shopify"}</option>
            <option value="standard">{"Standard Webhooks / Svix"}</option>
            <option value="generic">{"Generic HMAC"}</option>
          </select>
        </label>
        {options.provider === "generic" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Hash
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.algorithm}
            onChange={(e) => setOptions((o) => ({ ...o, algorithm: e.target.value as Options["algorithm"] }))}
          >
            <option value="sha256">{"SHA-256"}</option>
            <option value="sha1">{"SHA-1"}</option>
            <option value="sha512">{"SHA-512"}</option>
          </select>
        </label>
        )}
        {options.provider === "generic" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Encoding
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.encoding}
            onChange={(e) => setOptions((o) => ({ ...o, encoding: e.target.value as Options["encoding"] }))}
          >
            <option value="hex">{"Hex"}</option>
            <option value="base64">{"Base64"}</option>
          </select>
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">secret:, signature:, timestamp:, id: then a blank line and the raw body</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"secret: ...\nsignature: ...\n\n{...}"}
                aria-label="secret:, signature:, timestamp:, id: then a blank line and the raw body"
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
