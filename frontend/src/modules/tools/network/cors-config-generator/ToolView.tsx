"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { generateCors } from "./transform";
import type { CorsConfigGeneratorOptions } from "./schema";

type Options = CorsConfigGeneratorOptions;

const defaultOptions: Options = {"target":"spring-mvc"} as Options;

export function CorsConfigGeneratorToolView() {
  const [input, setInput] = useState("origins: https://app.example.com, https://admin.example.com\nmethods: GET, POST, PUT, DELETE, OPTIONS\nheaders: Content-Type, Authorization\nexpose: X-Request-Id\ncredentials: true\nmaxage: 3600");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateCors(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Target
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.target}
            onChange={(e) => setOptions((o) => ({ ...o, target: e.target.value as Options["target"] }))}
          >
            <option value="spring-mvc">{"Spring MVC"}</option>
            <option value="spring-security">{"Spring Security"}</option>
            <option value="nginx">{"nginx"}</option>
            <option value="apache">{"Apache"}</option>
            <option value="express">{"Express"}</option>
            <option value="kong">{"Kong plugin"}</option>
            <option value="http-headers">{"Raw headers"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Fields: origins, methods, headers, expose, credentials, maxage</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="origins: https://app.example.com"
                aria-label="Fields: origins, methods, headers, expose, credentials, maxage"
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
