"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runAsn1DerDecoder } from "./transform";
import type { Asn1DerDecoderOptions } from "./schema";

type Options = Asn1DerDecoderOptions;

const defaultOptions: Options = {"inputMode":"auto","decodeEncapsulated":true,"showOffsets":true} as Options;

export function Asn1DerDecoderToolView() {
  const [input, setInput] = useState("-----BEGIN CERTIFICATE-----\nMIICBTCCAaugAwIBAgIUR+dm83drkiPhXocYvUVRx2UaomswCgYIKoZIzj0EAwIw\nOTELMAkGA1UEBhMCSU4xEjAQBgNVBAoMCUFjbWUgQmFuazEWMBQGA1UEAwwNYXBp\nLmFjbWUudGVzdDAeFw0yNjEwMjkwODEzMjdaFw0yNzEwMjkwODEzMjdaMDkxCzAJ\nBgNVBAYTAklOMRIwEAYDVQQKDAlBY21lIEJhbmsxFjAUBgNVBAMMDWFwaS5hY21l\nLnRlc3QwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAR9+lkj066C3py4Eg1IeB8I\nijLYcUxp0Pxq5X+n5kfNdKvnyoLoFvCljL+K0HnqUBhugrFP0GYQPlD+rJ0ZLqIO\no4GQMIGNMB0GA1UdDgQWBBSBEz5xqnd6s8dBsWeUPTGqmKo/+DAfBgNVHSMEGDAW\ngBSBEz5xqnd6s8dBsWeUPTGqmKo/+DAPBgNVHRMBAf8EBTADAQH/MCUGA1UdEQQe\nMByCDWFwaS5hY21lLnRlc3SCCyouYWNtZS50ZXN0MBMGA1UdJQQMMAoGCCsGAQUF\nBwMBMAoGCCqGSM49BAMCA0gAMEUCIQD17A+AR+hGtoNdTFBMklw4eIvAoAXwZg+i\n5RYWGvzFjgIgfpMJ/TlJYEp+pIhqAZLmxg0+logCwI8fGZvm3VOoQ+w=\n-----END CERTIFICATE-----");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runAsn1DerDecoder(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Input
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.inputMode}
            onChange={(e) => setOptions((o) => ({ ...o, inputMode: e.target.value as Options["inputMode"] }))}
          >
            <option value="auto">{"Auto (hex/base64/PEM)"}</option>
            <option value="hex">{"Hex"}</option>
            <option value="base64">{"Base64"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.decodeEncapsulated} onChange={(e) => setOptions((o) => ({ ...o, decodeEncapsulated: e.target.checked }))} />
          Open encapsulated data
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showOffsets} onChange={(e) => setOptions((o) => ({ ...o, showOffsets: e.target.checked }))} />
          Offsets
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">PEM, base64 or hex</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="-----BEGIN CERTIFICATE-----"
                aria-label="PEM, base64 or hex"
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
