"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { convertDockerRun } from "./transform";
import { dockerRunToComposeOptionsSchema, type DockerRunToComposeOptions } from "./schema";

type Options = DockerRunToComposeOptions;

const defaultOptions: Options = dockerRunToComposeOptionsSchema.parse({});

export function DockerRunToComposeToolView() {
  const [input, setInput] = useState("docker run -d --name db -p 5432:5432 -e POSTGRES_PASSWORD=secret -v pgdata:/var/lib/postgresql/data --restart unless-stopped postgres:16");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertDockerRun(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Service name
          <input
            type="text"
            value={options.serviceName}
            placeholder="auto"
            onChange={(e) => setOptions((o) => ({ ...o, serviceName: e.target.value }))}
            className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Environment
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.envStyle}
            onChange={(e) => setOptions((o) => ({ ...o, envStyle: e.target.value as Options["envStyle"] }))}
          >
            <option value="list">- KEY=value</option>
            <option value="map">KEY: value</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.extractSecrets}
            onChange={(e) => setOptions((o) => ({ ...o, extractSecrets: e.target.checked }))}
          />
          Move secrets to .env
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.containerName}
            onChange={(e) => setOptions((o) => ({ ...o, containerName: e.target.checked }))}
          />
          Keep container_name
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.externalNetworks}
            onChange={(e) => setOptions((o) => ({ ...o, externalNetworks: e.target.checked }))}
          />
          Networks are external
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">docker run command</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="docker run -d --name web -p 8080:80 nginx"
                aria-label="docker run command"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane label="docker-compose.yml" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
