"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runDockerfileLinter } from "./transform";
import type { DockerfileLinterOptions } from "./schema";

type Options = DockerfileLinterOptions;

const defaultOptions: Options = {"minSeverity":"info"} as Options;

export function DockerfileLinterToolView() {
  const [input, setInput] = useState("FROM node:latest\nWORKDIR app\nADD . /app\nENV API_KEY=abc123\nRUN apt-get update && apt-get install curl\nCMD npm start\n");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runDockerfileLinter(input, options), [input, options]);

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
            <option value="info">{"All findings"}</option>
            <option value="warning">{"Warnings and errors"}</option>
            <option value="error">{"Errors only"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Dockerfile</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"FROM node:latest\nRUN apt-get update && apt-get install nodejs"}
                aria-label="Dockerfile"
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
