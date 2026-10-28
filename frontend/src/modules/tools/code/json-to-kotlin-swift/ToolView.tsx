"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { jsonToKotlinSwift } from "./transform";
import type { JsonToKotlinSwiftOptions } from "./schema";

type Options = JsonToKotlinSwiftOptions;

const defaultOptions: Options = {"target":"kotlin-serialization","optionalDefaults":true} as Options;

export function JsonToKotlinSwiftToolView() {
  const [input, setInput] = useState("name: User\n{\"user_id\":1,\"full_name\":\"Ann Lee\",\"is_active\":true,\"balance\":12.5,\"nickname\":null,\"addresses\":[{\"zip_code\":\"411001\",\"city\":\"Pune\"}]}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => jsonToKotlinSwift(input, options), [input, options]);

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
            <option value="kotlin-serialization">{"Kotlin (kotlinx)"}</option>
            <option value="kotlin-jackson">{"Kotlin (Jackson)"}</option>
            <option value="kotlin-plain">{"Kotlin (plain)"}</option>
            <option value="swift-codable">{"Swift Codable"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.optionalDefaults} onChange={(e) => setOptions((o) => ({ ...o, optionalDefaults: e.target.checked }))} />
          Nullable fields default to null
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">JSON sample (optional first line: name: User)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"{\"user_id\": 1}"}
                aria-label="JSON sample (optional first line: name: User)"
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
