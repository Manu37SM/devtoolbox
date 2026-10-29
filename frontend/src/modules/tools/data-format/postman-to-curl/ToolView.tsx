"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runPostmanToCurl } from "./transform";
import type { PostmanToCurlOptions } from "./schema";

type Options = PostmanToCurlOptions;

const defaultOptions: Options = {"shell":"bash","variables":"resolve","maskSecrets":false} as Options;

export function PostmanToCurlToolView() {
  const [input, setInput] = useState("{\n  \"info\": { \"name\": \"Orders\", \"schema\": \"https://schema.getpostman.com/json/collection/v2.1.0/collection.json\" },\n  \"auth\": { \"type\": \"bearer\", \"bearer\": [{ \"key\": \"token\", \"value\": \"{{token}}\" }] },\n  \"variable\": [{ \"key\": \"baseUrl\", \"value\": \"https://api.example.com\" }],\n  \"item\": [\n    { \"name\": \"List orders\", \"request\": { \"method\": \"GET\", \"header\": [{ \"key\": \"Accept\", \"value\": \"application/json\" }], \"url\": \"{{baseUrl}}/orders?page=1\" } },\n    { \"name\": \"Create order\", \"request\": { \"method\": \"POST\", \"body\": { \"mode\": \"raw\", \"raw\": \"{\\\"sku\\\":\\\"AB12\\\",\\\"qty\\\":2}\", \"options\": { \"raw\": { \"language\": \"json\" } } }, \"url\": \"{{baseUrl}}/orders\" } }\n  ]\n}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runPostmanToCurl(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Shell
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.shell}
            onChange={(e) => setOptions((o) => ({ ...o, shell: e.target.value as Options["shell"] }))}
          >
            <option value="bash">{"Bash"}</option>
            <option value="powershell">{"PowerShell (curl.exe)"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Variables
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.variables}
            onChange={(e) => setOptions((o) => ({ ...o, variables: e.target.value as Options["variables"] }))}
          >
            <option value="resolve">{"Resolve from collection"}</option>
            <option value="env">{"As environment variables"}</option>
            <option value="keep">{"Keep {{var}}"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.maskSecrets} onChange={(e) => setOptions((o) => ({ ...o, maskSecrets: e.target.checked }))} />
          Mask tokens
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Postman collection JSON</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"{\"info\": {...}, \"item\": [...]}"}
                aria-label="Postman collection JSON"
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
