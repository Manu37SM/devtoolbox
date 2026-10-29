"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runKubernetesManifestGenerator } from "./transform";
import type { KubernetesManifestGeneratorOptions } from "./schema";

type Options = KubernetesManifestGeneratorOptions;

const defaultOptions: Options = {"springBoot":true,"service":true,"ingress":true,"hpa":true,"pdb":true} as Options;

export function KubernetesManifestGeneratorToolView() {
  const [input, setInput] = useState("name: orders-api\nimage: ghcr.io/acme/orders-api:2.3.1\nnamespace: shop\nhost: orders.acme.com\nreplicas: 2\nenv: SPRING_PROFILES_ACTIVE=prod; TZ=Asia/Kolkata\nsecret-env: DB_PASSWORD");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runKubernetesManifestGenerator(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.springBoot} onChange={(e) => setOptions((o) => ({ ...o, springBoot: e.target.checked }))} />
          Spring Boot preset
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.service} onChange={(e) => setOptions((o) => ({ ...o, service: e.target.checked }))} />
          Service
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.ingress} onChange={(e) => setOptions((o) => ({ ...o, ingress: e.target.checked }))} />
          Ingress
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.hpa} onChange={(e) => setOptions((o) => ({ ...o, hpa: e.target.checked }))} />
          HPA
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.pdb} onChange={(e) => setOptions((o) => ({ ...o, pdb: e.target.checked }))} />
          PDB
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Fields: name, image, port, replicas, namespace, host, env, secret-env, cpu-request, memory-limit</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"name: orders\nimage: ghcr.io/acme/orders:1.0.0"}
                aria-label="Fields: name, image, port, replicas, namespace, host, env, secret-env, cpu-request, memory-limit"
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
