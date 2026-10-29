"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runOauthRequestBuilder } from "./transform";
import type { OauthRequestBuilderOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

type Options = OauthRequestBuilderOptions;

const defaultOptions: Options = {"flow":"authorization-code","clientAuth":"basic"} as Options;

export function OauthRequestBuilderToolView() {
  const [input, setInput] = useState("issuer: https://id.acme.com/realms/bank\nclient_id: web-app\nredirect_uri: https://app.acme.com/callback\nscope: openid profile email");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const [result, setResult] = useState<TransformResult>({ output: "", error: null });
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    void runOauthRequestBuilder(input, options).then((next) => {
      if (id === requestId.current) setResult(next);
    });
  }, [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Flow
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.flow}
            onChange={(e) => setOptions((o) => ({ ...o, flow: e.target.value as Options["flow"] }))}
          >
            <option value="authorization-code">{"Authorization code + PKCE"}</option>
            <option value="client-credentials">{"Client credentials"}</option>
            <option value="refresh-token">{"Refresh token"}</option>
            <option value="device-code">{"Device code"}</option>
            <option value="password">{"Password (legacy)"}</option>
            <option value="callback">{"Parse callback URL"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Client auth
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.clientAuth}
            onChange={(e) => setOptions((o) => ({ ...o, clientAuth: e.target.value as Options["clientAuth"] }))}
          >
            <option value="basic">{"client_secret_basic"}</option>
            <option value="post">{"client_secret_post"}</option>
            <option value="none">{"None (public)"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Fields: issuer, client_id, client_secret, redirect_uri, scope, code, refresh_token, callback</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="issuer: https://id.example.com/realms/acme"
                aria-label="Fields: issuer, client_id, client_secret, redirect_uri, scope, code, refresh_token, callback"
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
