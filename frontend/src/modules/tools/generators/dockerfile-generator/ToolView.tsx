"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runDockerfileGenerator } from "./transform";
import type { DockerfileGeneratorOptions } from "./schema";

type Options = DockerfileGeneratorOptions;

const defaultOptions: Options = {"stack":"spring-boot-maven","base":"standard","includeDockerignore":true} as Options;

export function DockerfileGeneratorToolView() {
  const [input, setInput] = useState("java: 21\nport: 8080");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runDockerfileGenerator(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Stack
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.stack}
            onChange={(e) => setOptions((o) => ({ ...o, stack: e.target.value as Options["stack"] }))}
          >
            <option value="spring-boot-maven">{"Spring Boot (Maven)"}</option>
            <option value="spring-boot-gradle">{"Spring Boot (Gradle)"}</option>
            <option value="node">{"Node.js"}</option>
            <option value="nextjs">{"Next.js"}</option>
            <option value="python">{"Python"}</option>
            <option value="go">{"Go"}</option>
            <option value="spa-nginx">{"SPA on nginx"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Base image
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.base}
            onChange={(e) => setOptions((o) => ({ ...o, base: e.target.value as Options["base"] }))}
          >
            <option value="standard">{"Standard"}</option>
            <option value="alpine">{"Alpine"}</option>
            <option value="distroless">{"Distroless"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.includeDockerignore} onChange={(e) => setOptions((o) => ({ ...o, includeDockerignore: e.target.checked }))} />
          .dockerignore
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Fields: port, java, node, python, go, cmd, main, dist</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"java: 21\nport: 8080"}
                aria-label="Fields: port, java, node, python, go, cmd, main, dist"
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
