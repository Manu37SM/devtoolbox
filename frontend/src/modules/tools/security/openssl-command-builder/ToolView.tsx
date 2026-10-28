"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { buildOpenssl } from "./transform";
import type { OpensslCommandBuilderOptions } from "./schema";

type Options = OpensslCommandBuilderOptions;

const defaultOptions: Options = {"task":"self-signed","digest":"sha256","encryptKey":false} as Options;

export function OpensslCommandBuilderToolView() {
  const [input, setInput] = useState("cn: example.com\nsan: www.example.com, 10.0.0.5\no: Acme Corp\nc: IN\ndays: 365\nbits: 2048");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => buildOpenssl(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Task
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.task}
            onChange={(e) => setOptions((o) => ({ ...o, task: e.target.value as Options["task"] }))}
          >
            <option value="self-signed">{"Self-signed certificate"}</option>
            <option value="csr">{"CSR with SAN"}</option>
            <option value="rsa-key">{"RSA key pair"}</option>
            <option value="ec-key">{"EC key"}</option>
            <option value="view-cert">{"View certificate"}</option>
            <option value="view-csr">{"View CSR"}</option>
            <option value="verify-chain">{"Verify chain"}</option>
            <option value="pem-to-der">{"PEM to DER"}</option>
            <option value="der-to-pem">{"DER to PEM"}</option>
            <option value="pkcs12-export">{"PKCS#12 export"}</option>
            <option value="pkcs12-extract">{"PKCS#12 extract"}</option>
            <option value="s-client">{"Test TLS server"}</option>
            <option value="check-key-match">{"Key matches cert?"}</option>
            <option value="hash-file">{"Hash a file"}</option>
            <option value="dhparam">{"DH parameters"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Digest
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.digest}
            onChange={(e) => setOptions((o) => ({ ...o, digest: e.target.value as Options["digest"] }))}
          >
            <option value="sha256">{"sha256"}</option>
            <option value="sha384">{"sha384"}</option>
            <option value="sha512">{"sha512"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.encryptKey} onChange={(e) => setOptions((o) => ({ ...o, encryptKey: e.target.checked }))} />
          Encrypt private key
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Fields (cn, san, o, c, days, bits, key, cert, host ...)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="cn: example.com"
                aria-label="Fields (cn, san, o, c, days, bits, key, cert, host ...)"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane label="Commands" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
