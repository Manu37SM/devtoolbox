"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { viewOpenapi } from "./transform";
import type { OpenapiViewerOptions } from "./schema";

type Options = OpenapiViewerOptions;

const defaultOptions: Options = {"view":"all"} as Options;

export function OpenapiViewerToolView() {
  const [input, setInput] = useState("openapi: 3.0.3\ninfo:\n  title: Demo API\n  version: 1.0.0\npaths:\n  /users/{id}:\n    get:\n      summary: Get a user\n      responses:\n        '200':\n          description: OK\n");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => viewOpenapi(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          View
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.view}
            onChange={(e) => setOptions((o) => ({ ...o, view: e.target.value as Options["view"] }))}
          >
            <option value="all">{"Everything"}</option>
            <option value="endpoints">{"Endpoints"}</option>
            <option value="schemas">{"Schemas"}</option>
            <option value="lint">{"Lint only"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">OpenAPI / Swagger document (JSON or YAML)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"openapi: 3.0.3\ninfo: ..."}
                aria-label="OpenAPI / Swagger document (JSON or YAML)"
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
