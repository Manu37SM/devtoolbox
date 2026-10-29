"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runDockerComposeToKubernetes } from "./transform";
import type { DockerComposeToKubernetesOptions } from "./schema";

type Options = DockerComposeToKubernetesOptions;

const defaultOptions: Options = {"serviceType":"ClusterIP","namespace":"","secretsFromEnv":true,"includeProbes":true} as Options;

export function DockerComposeToKubernetesToolView() {
  const [input, setInput] = useState("services:\n  api:\n    image: acme/orders-api:1.4.2\n    ports:\n      - \"8080:8080\"\n    environment:\n      SPRING_PROFILES_ACTIVE: prod\n      DB_PASSWORD: s3cret\n    depends_on: [db]\n    deploy:\n      replicas: 2\n      resources:\n        limits: { cpus: \"0.5\", memory: 512M }\n    healthcheck:\n      test: [\"CMD-SHELL\", \"curl -f http://localhost:8080/actuator/health || exit 1\"]\n      interval: 30s\n  db:\n    image: postgres:17\n    environment:\n      POSTGRES_PASSWORD: pg\n    volumes:\n      - pgdata:/var/lib/postgresql/data\nvolumes:\n  pgdata: {}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runDockerComposeToKubernetes(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Service type
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.serviceType}
            onChange={(e) => setOptions((o) => ({ ...o, serviceType: e.target.value as Options["serviceType"] }))}
          >
            <option value="ClusterIP">{"ClusterIP"}</option>
            <option value="NodePort">{"NodePort"}</option>
            <option value="LoadBalancer">{"LoadBalancer"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Namespace
          <input
            type="text"
            value={options.namespace}
            onChange={(e) => setOptions((o) => ({ ...o, namespace: e.target.value }))}
            placeholder="optional"
            aria-label="Namespace"
            className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.secretsFromEnv} onChange={(e) => setOptions((o) => ({ ...o, secretsFromEnv: e.target.checked }))} />
          Move secret-looking env to Secrets
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.includeProbes} onChange={(e) => setOptions((o) => ({ ...o, includeProbes: e.target.checked }))} />
          Healthcheck to probes
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">docker-compose.yml</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"services:\n  web:\n    image: ..."}
                aria-label="docker-compose.yml"
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
