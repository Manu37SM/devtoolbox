"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { generatePom } from "./transform";
import type { MavenPomGeneratorOptions } from "./schema";

type Options = MavenPomGeneratorOptions;

const defaultOptions: Options = {"type":"spring-boot","javaVersion":"21","packaging":"jar"} as Options;

export function MavenPomGeneratorToolView() {
  const [input, setInput] = useState("group: com.acme\nartifact: orders-service\nversion: 1.0.0\nspring-boot: 3.4.1\nname: Orders Service\ndependencies: web, data-jpa, oracle, validation, actuator, lombok");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => generatePom(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Project type
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.type}
            onChange={(e) => setOptions((o) => ({ ...o, type: e.target.value as Options["type"] }))}
          >
            <option value="spring-boot">{"Spring Boot"}</option>
            <option value="plain-jar">{"Plain JAR"}</option>
            <option value="library">{"Library (with sources)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Java
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.javaVersion}
            onChange={(e) => setOptions((o) => ({ ...o, javaVersion: e.target.value as Options["javaVersion"] }))}
          >
            <option value="17">{"17"}</option>
            <option value="21">{"21"}</option>
            <option value="25">{"25"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Packaging
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.packaging}
            onChange={(e) => setOptions((o) => ({ ...o, packaging: e.target.value as Options["packaging"] }))}
          >
            <option value="jar">{"jar"}</option>
            <option value="war">{"war"}</option>
            <option value="pom">{"pom"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Fields: group, artifact, version, spring-boot, name, dependencies</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="group: com.acme"
                aria-label="Fields: group, artifact, version, spring-boot, name, dependencies"
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
