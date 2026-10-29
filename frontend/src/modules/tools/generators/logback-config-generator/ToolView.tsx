"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runLogbackConfigGenerator } from "./transform";
import type { LogbackConfigGeneratorOptions } from "./schema";

type Options = LogbackConfigGeneratorOptions;

const defaultOptions: Options = {"framework":"logback","format":"profile-split","rollingFile":true,"async":true} as Options;

export function LogbackConfigGeneratorToolView() {
  const [input, setInput] = useState("app: orders\nlog-dir: /var/log/orders\nlevels: com.acme=DEBUG; org.hibernate.SQL=DEBUG\nmax-history: 14");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runLogbackConfigGenerator(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Framework
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.framework}
            onChange={(e) => setOptions((o) => ({ ...o, framework: e.target.value as Options["framework"] }))}
          >
            <option value="logback">{"logback-spring.xml"}</option>
            <option value="log4j2">{"log4j2-spring.xml"}</option>
            <option value="spring-properties">{"application.yml"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Format
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.format}
            onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}
          >
            <option value="profile-split">{"Pattern in dev, JSON in prod"}</option>
            <option value="pattern">{"Pattern"}</option>
            <option value="json-ecs">{"JSON (ECS)"}</option>
            <option value="json-logstash">{"JSON (Logstash)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.rollingFile} onChange={(e) => setOptions((o) => ({ ...o, rollingFile: e.target.checked }))} />
          Rolling file
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.async} onChange={(e) => setOptions((o) => ({ ...o, async: e.target.checked }))} />
          Async
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Fields: app, log-dir, levels, max-file-size, max-history, total-size-cap, json-profiles</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="app: orders"
                aria-label="Fields: app, log-dir, levels, max-file-size, max-history, total-size-cap, json-profiles"
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
