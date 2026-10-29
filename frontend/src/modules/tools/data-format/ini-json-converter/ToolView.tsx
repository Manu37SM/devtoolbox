"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runIniJson } from "./transform";
import type { IniJsonConverterOptions } from "./schema";

type Options = IniJsonConverterOptions;

const defaultOptions: Options = {"direction":"ini-to-json","inferTypes":true,"nestDotted":false,"indent":"2"} as Options;

export function IniJsonConverterToolView() {
  const [input, setInput] = useState("; app config\nname = demo\ndebug = true\n\n[server]\nhost = localhost\nport = 8080\ntags = a\ntags = b\n\n[server.tls]\nenabled = off\n");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runIniJson(input, options), [input, options]);

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
            <option value="ini-to-json">{"INI → JSON"}</option>
            <option value="json-to-ini">{"JSON → INI"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.inferTypes} onChange={(e) => setOptions((o) => ({ ...o, inferTypes: e.target.checked }))} />
          Detect numbers and booleans
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.nestDotted} onChange={(e) => setOptions((o) => ({ ...o, nestDotted: e.target.checked }))} />
          Nest [a.b] sections
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Indent
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.indent}
            onChange={(e) => setOptions((o) => ({ ...o, indent: e.target.value as Options["indent"] }))}
          >
            <option value="2">{"2 spaces"}</option>
            <option value="4">{"4 spaces"}</option>
            <option value="tab">{"Tab"}</option>
            <option value="min">{"Minified"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"[server]\nhost = localhost"}
                aria-label="Input"
                className="font-mono"
              />
            </div>
          }
          output={<OutputPane onSwap={() => setOptions((o) => ({ ...o, direction: o.direction === "ini-to-json" ? "json-to-ini" : o.direction === "json-to-ini" ? "ini-to-json" : o.direction }))} label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
