"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runDockerComposeGenerator } from "./transform";
import type { DockerComposeGeneratorOptions } from "./schema";

type Options = DockerComposeGeneratorOptions;

const defaultOptions: Options = {"healthchecks":true,"includeApp":true,"envDefaults":true} as Options;

export function DockerComposeGeneratorToolView() {
  const [input, setInput] = useState("project: orders\nservices: postgres, redis, kafka, mailpit\napp-port: 8080");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runDockerComposeGenerator(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.healthchecks} onChange={(e) => setOptions((o) => ({ ...o, healthchecks: e.target.checked }))} />
          Healthchecks
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.includeApp} onChange={(e) => setOptions((o) => ({ ...o, includeApp: e.target.checked }))} />
          App service
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.envDefaults} onChange={(e) => setOptions((o) => ({ ...o, envDefaults: e.target.checked }))} />
          Env var defaults
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Fields: services, project, app-port</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="services: postgres, redis"
                aria-label="Fields: services, project, app-port"
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
