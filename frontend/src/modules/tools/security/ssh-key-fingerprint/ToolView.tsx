"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { fingerprintKeys } from "./transform";
import type { SshKeyFingerprintOptions } from "./schema";

type Options = SshKeyFingerprintOptions;

const defaultOptions: Options = {"format":"both"} as Options;

export function SshKeyFingerprintToolView() {
  const [input, setInput] = useState("ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl demo@laptop");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => fingerprintKeys(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Fingerprint
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.format}
            onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}
          >
            <option value="both">{"SHA256 and MD5"}</option>
            <option value="sha256">{"SHA256"}</option>
            <option value="md5">{"MD5"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Public keys (one per line)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="ssh-ed25519 AAAAC3Nz... user@host"
                aria-label="Public keys (one per line)"
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
