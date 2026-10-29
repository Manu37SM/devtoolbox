"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runK8sLint } from "./transform";
import type { KubernetesManifestLinterOptions } from "./schema";

type Options = KubernetesManifestLinterOptions;

const defaultOptions: Options = {"minSeverity":"info","securityChecks":true,"reliabilityChecks":true} as Options;

export function KubernetesManifestLinterToolView() {
  const [input, setInput] = useState("apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: web\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: web\n  template:\n    metadata:\n      labels:\n        app: web\n    spec:\n      containers:\n        - name: web\n          image: nginx:latest\n          securityContext:\n            privileged: true");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runK8sLint(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Show
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.minSeverity}
            onChange={(e) => setOptions((o) => ({ ...o, minSeverity: e.target.value as Options["minSeverity"] }))}
          >
            <option value="info">{"Info and above"}</option>
            <option value="warning">{"Warnings and errors"}</option>
            <option value="error">{"Errors only"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.securityChecks} onChange={(e) => setOptions((o) => ({ ...o, securityChecks: e.target.checked }))} />
          Security checks
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.reliabilityChecks} onChange={(e) => setOptions((o) => ({ ...o, reliabilityChecks: e.target.checked }))} />
          Reliability checks
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Kubernetes YAML (multiple documents allowed)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"apiVersion: apps/v1\nkind: Deployment"}
                aria-label="Kubernetes YAML (multiple documents allowed)"
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
