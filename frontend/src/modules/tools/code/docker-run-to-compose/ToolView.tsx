"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { convertDockerRun } from "./transform";
import type { DockerRunToComposeOptions } from "./schema";

type Options = DockerRunToComposeOptions;

const defaultOptions: Options = {} as Options;

export function DockerRunToComposeToolView() {
  const [input, setInput] = useState("docker run -d --name db -p 5432:5432 -e POSTGRES_PASSWORD=secret -v pgdata:/var/lib/postgresql/data --restart unless-stopped postgres:16");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertDockerRun(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">docker run command</label>
              <Textarea
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
