"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runJvmFlagsExplainer } from "./transform";
import type { JvmFlagsExplainerOptions } from "./schema";

type Options = JvmFlagsExplainerOptions;

const defaultOptions: Options = {"javaVersion":"21","showSystemProperties":true} as Options;

export function JvmFlagsExplainerToolView() {
  const [input, setInput] = useState("JAVA_OPTS=\"-Xms512m -Xmx2g -XX:+UseConcMarkSweepGC -XX:MaxPermSize=256m -XX:+HeapDumpOnOutOfMemoryError -XX:MaxRAMPercentage=75 -Dspring.profiles.active=prod -Ddb.password=changeme\"\njava $JAVA_OPTS -jar app.jar");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runJvmFlagsExplainer(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          JDK
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.javaVersion}
            onChange={(e) => setOptions((o) => ({ ...o, javaVersion: e.target.value as Options["javaVersion"] }))}
          >
            <option value="8">{"8"}</option>
            <option value="11">{"11"}</option>
            <option value="17">{"17"}</option>
            <option value="21">{"21"}</option>
            <option value="25">{"25"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showSystemProperties} onChange={(e) => setOptions((o) => ({ ...o, showSystemProperties: e.target.checked }))} />
          List -D properties
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">java command or JAVA_OPTS</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="java -Xmx2g -XX:+UseG1GC -jar app.jar"
                aria-label="java command or JAVA_OPTS"
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
