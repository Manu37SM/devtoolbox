"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { generateSecurityTxt } from "./transform";
import type { SecurityTxtGeneratorOptions } from "./schema";

type Options = SecurityTxtGeneratorOptions;

const defaultOptions: Options = {"expiresInDays":365} as Options;

export function SecurityTxtGeneratorToolView() {
  const [input, setInput] = useState("contact: security@example.com\npolicy: https://example.com/security-policy\nencryption: https://example.com/pgp-key.txt\ncanonical: https://example.com/.well-known/security.txt\nlanguage: en");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateSecurityTxt(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Expires in (days)
          <input
            type="number"
            min={1} max={366}
            value={options.expiresInDays}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, expiresInDays: n }));
            }}
            className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
          />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Fields (one per line: contact, policy, encryption, hiring, canonical, acknowledgments, language)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="contact: security@example.com"
                aria-label="Fields (one per line: contact, policy, encryption, hiring, canonical, acknowledgments, language)"
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
