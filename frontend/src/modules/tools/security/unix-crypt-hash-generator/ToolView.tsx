"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { unixCryptHashGenerator } from "./transform";
import type { UnixCryptHashGeneratorOptions } from "./schema";

type Options = UnixCryptHashGeneratorOptions;

const defaultOptions: Options = {"action": "hash", "algorithm": "sha512", "salt": "", "rounds": 5000, "explicitRounds": false} as Options;

export function UnixCryptHashGeneratorToolView() {
  const [in0, setIn0] = useState("correct horse battery staple");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => unixCryptHashGenerator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Action"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.action} onChange={(e) => setOptions((o) => ({ ...o, action: e.target.value as Options["action"] }))}>
            <option value={"hash"}>{"Generate hashes"}</option>
            <option value={"verify"}>{"Verify a password"}</option>
          </select>
        </label>
        {["hash"].includes(String(options.action)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Algorithm"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.algorithm} onChange={(e) => setOptions((o) => ({ ...o, algorithm: e.target.value as Options["algorithm"] }))}>
            <option value={"sha512"}>{"SHA-512 ($6$)"}</option>
            <option value={"sha256"}>{"SHA-256 ($5$)"}</option>
            <option value={"md5"}>{"MD5 ($1$, legacy)"}</option>
          </select>
        </label>
        )}
        {["sha512", "sha256"].includes(String(options.algorithm)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Rounds"}
          <input type="number" min={1000} max={200000} step={1000} value={options.rounds} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, rounds: Math.min(200000, Math.max(1000, n)) })); }} className="w-24 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        )}
        {["hash"].includes(String(options.action)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Salt (optional)"}
          <input type="text" value={options.salt} placeholder={"empty = random"} onChange={(e) => setOptions((o) => ({ ...o, salt: e.target.value }))} className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["sha512", "sha256"].includes(String(options.algorithm)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.explicitRounds} onChange={(e) => setOptions((o) => ({ ...o, explicitRounds: e.target.checked }))} />
          {"Always print rounds="}
        </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Passwords, one per line (verify: password, then the hash on line 2)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"correct horse battery staple"}
                  aria-label={"Passwords, one per line (verify: password, then the hash on line 2)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Hash"} fileName={"shadow-hashes.txt"} value={result.output} error={result.error?.message ?? null} placeholder={"Enter a password"} />}
        />
      </div>
    </div>
  );
}
