"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { generateHmac } from "./transform";
import type { HmacAlgorithm, HmacGeneratorOptions, HmacOutputFormat } from "./schema";

const ALGORITHMS: HmacAlgorithm[] = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];
const OUTPUT_FORMATS: HmacOutputFormat[] = ["hex", "base64"];

export function HmacGeneratorToolView() {
  const [message, setMessage] = useState("");
  const [secret, setSecret] = useState("");
  const [options, setOptions] = useState<HmacGeneratorOptions>({
    algorithm: "SHA-256",
    outputFormat: "hex",
  });
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    generateHmac(message, secret, options).then((result) => {
      if (id !== requestId.current) return;
      setOutput(result.output);
      setError(result.error?.message ?? null);
    });
  }, [message, secret, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text-secondary" htmlFor="hmac-secret">
          Secret key
        </label>
        <input
          id="hmac-secret"
          type="text"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          aria-label="Secret key"
          placeholder="Enter secret key"
          className="w-full rounded-sm border border-border-default bg-bg-raised px-2 py-1.5 text-sm font-mono"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={options.algorithm}
          onChange={(e) =>
            setOptions((o) => ({ ...o, algorithm: e.target.value as HmacAlgorithm }))
          }
          className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          aria-label="HMAC algorithm"
        >
          {ALGORITHMS.map((algo) => (
            <option key={algo} value={algo}>
              {algo}
            </option>
          ))}
        </select>
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          {OUTPUT_FORMATS.map((format) => (
            <Button
              key={format}
              variant={options.outputFormat === format ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => setOptions((o) => ({ ...o, outputFormat: format }))}
            >
              {format}
            </Button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                aria-label="Message to authenticate"
              />
            </div>
          }
          output={<OutputPane label="HMAC" value={output} error={error} />}
        />
      </div>
    </div>
  );
}
