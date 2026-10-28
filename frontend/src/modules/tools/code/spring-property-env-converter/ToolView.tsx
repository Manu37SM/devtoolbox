"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { convertSpringEnv } from "./transform";
import type { SpringPropertyEnvConverterOptions } from "./schema";

type Options = SpringPropertyEnvConverterOptions;

const defaultOptions: Options = {"direction":"to-env","format":"dotenv","includeValues":true} as Options;

export function SpringPropertyEnvConverterToolView() {
  const [input, setInput] = useState("spring.datasource.url=jdbc:postgresql://db:5432/app\nspring.datasource.username=app\nserver.port=8080\nmy.acme.feature-flag.enabled=true\nspring.kafka.bootstrap-servers[0]=kafka:9092");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertSpringEnv(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Direction
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.direction}
            onChange={(e) => setOptions((o) => ({ ...o, direction: e.target.value as Options["direction"] }))}
          >
            <option value="to-env">{"Property to env var"}</option>
            <option value="from-env">{"Env var to property"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.format}
            onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}
          >
            <option value="dotenv">{".env"}</option>
            <option value="export">{"export"}</option>
            <option value="docker-compose">{"Docker Compose"}</option>
            <option value="kubernetes">{"Kubernetes env"}</option>
            <option value="jvm">{"JVM -D flags"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.includeValues} onChange={(e) => setOptions((o) => ({ ...o, includeValues: e.target.checked }))} />
          Include values
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">application.properties or application.yml</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="spring.datasource.url=jdbc:..."
                aria-label="application.properties or application.yml"
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
