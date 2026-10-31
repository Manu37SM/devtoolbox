"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { gitlabCiGenerator } from "./transform";
import type { GitlabCiGeneratorOptions } from "./schema";

type Options = GitlabCiGeneratorOptions;

const defaultOptions: Options = {"stack": "node", "version": "", "packageManager": "npm", "stages": ["lint", "test", "build"], "services": [], "cache": true, "artifacts": true, "mrPipelines": true, "dockerPush": true, "deploy": "none", "manualDeploy": true, "environmentName": "production", "coverage": false, "retry": 0, "interruptible": true, "timeoutMinutes": 0, "sast": false} as Options;

export function GitlabCiGeneratorToolView() {

  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => gitlabCiGenerator("", options), [options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Stack"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.stack} onChange={(e) => setOptions((o) => ({ ...o, stack: e.target.value as Options["stack"] }))}>
            <option value={"node"}>{"Node.js"}</option>
            <option value={"java-maven"}>{"Java (Maven)"}</option>
            <option value={"java-gradle"}>{"Java (Gradle)"}</option>
            <option value={"python"}>{"Python"}</option>
            <option value={"go"}>{"Go"}</option>
            <option value={"docker-only"}>{"Docker only"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Version"}
          <input type="text" value={options.version} placeholder={"22"} onChange={(e) => setOptions((o) => ({ ...o, version: e.target.value }))} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        {["node"].includes(String(options.stack)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Package manager"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.packageManager} onChange={(e) => setOptions((o) => ({ ...o, packageManager: e.target.value as Options["packageManager"] }))}>
            <option value={"npm"}>{"npm"}</option>
            <option value={"yarn"}>{"Yarn"}</option>
            <option value={"pnpm"}>{"pnpm"}</option>
          </select>
        </label>
        )}
        <fieldset className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          <legend className="sr-only">{"Stages"}</legend>
          <span>{"Stages"}</span>
          {([["lint", "lint"], ["test", "test"], ["build", "build"], ["docker", "docker"], ["deploy", "deploy"]] as const).map(([v, x]) => (
            <label key={v} className="flex items-center gap-1">
              <input type="checkbox" checked={(options.stages as string[]).includes(v)} onChange={(e) => setOptions((o) => ({ ...o, stages: (e.target.checked ? [...(o.stages as string[]), v] : (o.stages as string[]).filter((i) => i !== v)) as Options["stages"] }))} />
              {x}
            </label>
          ))}
        </fieldset>
        <fieldset className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          <legend className="sr-only">{"Services"}</legend>
          <span>{"Services"}</span>
          {([["postgres", "Postgres"], ["mysql", "MySQL"], ["redis", "Redis"], ["mongo", "MongoDB"]] as const).map(([v, x]) => (
            <label key={v} className="flex items-center gap-1">
              <input type="checkbox" checked={(options.services as string[]).includes(v)} onChange={(e) => setOptions((o) => ({ ...o, services: (e.target.checked ? [...(o.services as string[]), v] : (o.services as string[]).filter((i) => i !== v)) as Options["services"] }))} />
              {x}
            </label>
          ))}
        </fieldset>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Deploy"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.deploy} onChange={(e) => setOptions((o) => ({ ...o, deploy: e.target.value as Options["deploy"] }))}>
            <option value={"none"}>{"None"}</option>
            <option value={"ssh"}>{"SSH to a server"}</option>
            <option value={"kubectl"}>{"kubectl"}</option>
            <option value={"pages"}>{"GitLab Pages"}</option>
          </select>
        </label>
        {["ssh", "kubectl", "pages"].includes(String(options.deploy)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.manualDeploy} onChange={(e) => setOptions((o) => ({ ...o, manualDeploy: e.target.checked }))} />
          {"Manual deploy click"}
        </label>
        )}
        {["ssh", "kubectl", "pages"].includes(String(options.deploy)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Environment"}
          <input type="text" value={options.environmentName} placeholder={"production"} onChange={(e) => setOptions((o) => ({ ...o, environmentName: e.target.value }))} className="w-28 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.dockerPush} onChange={(e) => setOptions((o) => ({ ...o, dockerPush: e.target.checked }))} />
          {"Push image"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.cache} onChange={(e) => setOptions((o) => ({ ...o, cache: e.target.checked }))} />
          {"Cache"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.artifacts} onChange={(e) => setOptions((o) => ({ ...o, artifacts: e.target.checked }))} />
          {"Artifacts"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.coverage} onChange={(e) => setOptions((o) => ({ ...o, coverage: e.target.checked }))} />
          {"Coverage"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.mrPipelines} onChange={(e) => setOptions((o) => ({ ...o, mrPipelines: e.target.checked }))} />
          {"Merge-request pipelines"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.sast} onChange={(e) => setOptions((o) => ({ ...o, sast: e.target.checked }))} />
          {"SAST + secret scan"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.interruptible} onChange={(e) => setOptions((o) => ({ ...o, interruptible: e.target.checked }))} />
          {"Interruptible"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Retries"}
          <input type="number" min={0} max={2} value={options.retry} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, retry: Math.min(2, Math.max(0, n)) })); }} className="w-14 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Timeout (min)"}
          <input type="number" min={0} max={1440} value={options.timeoutMinutes} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, timeoutMinutes: Math.min(1440, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <OutputPane label={".gitlab-ci.yml"} fileName={".gitlab-ci.yml"} value={result.output} error={result.error?.message ?? null} placeholder={""} />
      </div>
    </div>
  );
}
