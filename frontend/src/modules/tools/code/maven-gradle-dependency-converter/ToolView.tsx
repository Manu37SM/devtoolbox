"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { convertDependencies } from "./transform";
import type { MavenGradleDependencyConverterOptions } from "./schema";

type Options = MavenGradleDependencyConverterOptions;

const defaultOptions: Options = {"direction":"maven-to-gradle","dsl":"groovy","includeExclusions":true} as Options;

export function MavenGradleDependencyConverterToolView() {
  const [input, setInput] = useState("<dependency>\n  <groupId>org.springframework.boot</groupId>\n  <artifactId>spring-boot-starter-web</artifactId>\n</dependency>\n<dependency>\n  <groupId>com.oracle.database.jdbc</groupId>\n  <artifactId>ojdbc11</artifactId>\n  <scope>runtime</scope>\n</dependency>\n<dependency>\n  <groupId>org.junit.jupiter</groupId>\n  <artifactId>junit-jupiter</artifactId>\n  <version>5.10.2</version>\n  <scope>test</scope>\n</dependency>");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => convertDependencies(input, options), [input, options]);

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
            <option value="maven-to-gradle">{"Maven to Gradle"}</option>
            <option value="gradle-to-maven">{"Gradle to Maven"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Gradle DSL
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.dsl}
            onChange={(e) => setOptions((o) => ({ ...o, dsl: e.target.value as Options["dsl"] }))}
          >
            <option value="groovy">{"Groovy"}</option>
            <option value="kotlin">{"Kotlin"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.includeExclusions} onChange={(e) => setOptions((o) => ({ ...o, includeExclusions: e.target.checked }))} />
          Keep exclusions
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Dependencies (XML or Gradle lines)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="<dependency>...</dependency>"
                aria-label="Dependencies (XML or Gradle lines)"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane onSwap={() => setOptions((o) => ({ ...o, direction: o.direction === "maven-to-gradle" ? "gradle-to-maven" : o.direction === "gradle-to-maven" ? "maven-to-gradle" : o.direction }))} label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
