"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runApigeePolicyGenerator } from "./transform";
import type { ApigeePolicyGeneratorOptions } from "./schema";

type Options = ApigeePolicyGeneratorOptions;

const defaultOptions: Options = {"policy":"spike-arrest"} as Options;

export function ApigeePolicyGeneratorToolView() {
  const [input, setInput] = useState("name: SA-Protect\nrate: 30ps\nidentifier: client_id\nuse-effective-count: true");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runApigeePolicyGenerator(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Policy
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.policy}
            onChange={(e) => setOptions((o) => ({ ...o, policy: e.target.value as Options["policy"] }))}
          >
            <option value="spike-arrest">{"SpikeArrest"}</option>
            <option value="quota">{"Quota"}</option>
            <option value="verify-api-key">{"VerifyAPIKey"}</option>
            <option value="oauth-verify">{"OAuthV2 VerifyAccessToken"}</option>
            <option value="assign-message">{"AssignMessage"}</option>
            <option value="raise-fault">{"RaiseFault"}</option>
            <option value="cors">{"CORS"}</option>
            <option value="json-threat-protection">{"JSONThreatProtection"}</option>
            <option value="access-control">{"AccessControl"}</option>
            <option value="response-cache">{"ResponseCache"}</option>
            <option value="kvm-get">{"KeyValueMapOperations (Get)"}</option>
            <option value="extract-variables">{"ExtractVariables"}</option>
            <option value="basic-auth-decode">{"BasicAuthentication"}</option>
            <option value="javascript">{"JavaScript"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Fields (name, rate, count, identifier, ...)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"name: SA-Protect\nrate: 30ps"}
                aria-label="Fields (name, rate, count, identifier, ...)"
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
