"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { generateSpringConfig } from "./transform";
import type { SpringConfigGeneratorOptions } from "./schema";

type Options = SpringConfigGeneratorOptions;

const defaultOptions: Options = {"format":"yaml","profile":"default"} as Options;

export function SpringConfigGeneratorToolView() {
  const [input, setInput] = useState("app: orders\nport: 8080\ndb: oracle\ndb-host: db.internal\ndb-name: ORDERS\nfeatures: jpa, flyway, actuator, kafka, oauth2-resource-server\nissuer: https://id.example.com/realms/acme\npackage: com.acme.orders");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generateSpringConfig(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Format
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.format}
            onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}
          >
            <option value="yaml">{"application.yml"}</option>
            <option value="properties">{"application.properties"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Profile
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.profile}
            onChange={(e) => setOptions((o) => ({ ...o, profile: e.target.value as Options["profile"] }))}
          >
            <option value="default">{"Default"}</option>
            <option value="dev">{"dev"}</option>
            <option value="prod">{"prod"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Fields: app, port, db, db-host, db-name, features, issuer, package</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="app: orders"
                aria-label="Fields: app, port, db, db-host, db-name, features, issuer, package"
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
