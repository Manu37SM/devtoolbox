"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { avroSchemaGenerator } from "./transform";
import type { AvroSchemaGeneratorOptions } from "./schema";

type Options = AvroSchemaGeneratorOptions;

const defaultOptions: Options = {"recordName": "Root", "namespace": "com.example", "nullable": "missing", "nullDefaults": true, "logicalTypes": false, "integers": "auto", "floats": "double", "mapMinKeys": 0, "aliases": true, "format": "avsc", "docs": false} as Options;

export function AvroSchemaGeneratorToolView() {
  const [in0, setIn0] = useState("[\n  {\"id\": 1, \"name\": \"Asha\", \"email\": null, \"tags\": [\"a\", \"b\"], \"address\": {\"city\": \"Pune\", \"zip\": \"411001\"}},\n  {\"id\": 2, \"name\": \"Ravi\", \"tags\": [], \"address\": {\"city\": \"Delhi\", \"zip\": \"110001\"}, \"score\": 4.5}\n]");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => avroSchemaGenerator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Record name"}
          <input type="text" value={options.recordName} placeholder={"Root"} onChange={(e) => setOptions((o) => ({ ...o, recordName: e.target.value }))} className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Namespace"}
          <input type="text" value={options.namespace} placeholder={"com.example"} onChange={(e) => setOptions((o) => ({ ...o, namespace: e.target.value }))} className="w-40 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Nullable fields"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.nullable} onChange={(e) => setOptions((o) => ({ ...o, nullable: e.target.value as Options["nullable"] }))}>
            <option value={"missing"}>{"Missing or null in a sample"}</option>
            <option value={"all"}>{"Every field"}</option>
            <option value={"none"}>{"Never"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Integers"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.integers} onChange={(e) => setOptions((o) => ({ ...o, integers: e.target.value as Options["integers"] }))}>
            <option value={"auto"}>{"int when it fits"}</option>
            <option value={"long"}>{"Always long"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Decimals"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.floats} onChange={(e) => setOptions((o) => ({ ...o, floats: e.target.value as Options["floats"] }))}>
            <option value={"double"}>{"double"}</option>
            <option value={"float"}>{"float"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Map from N keys (0 = off)"}
          <input type="number" min={0} max={1000} value={options.mapMinKeys} onChange={(e) => { const n = Number(e.target.value); if (e.target.value !== "" && Number.isFinite(n)) setOptions((o) => ({ ...o, mapMinKeys: Math.min(1000, Math.max(0, n)) })); }} className="w-20 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" />
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.nullDefaults} onChange={(e) => setOptions((o) => ({ ...o, nullDefaults: e.target.checked }))} />
          {"default: null on nullable"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.logicalTypes} onChange={(e) => setOptions((o) => ({ ...o, logicalTypes: e.target.checked }))} />
          {"Logical types (date, timestamp, uuid)"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.aliases} onChange={(e) => setOptions((o) => ({ ...o, aliases: e.target.checked }))} />
          {"Keep original names as aliases"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.docs} onChange={(e) => setOptions((o) => ({ ...o, docs: e.target.checked }))} />
          {"Doc string with JSON path"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Output"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.format} onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}>
            <option value={"avsc"}>{"Pretty .avsc"}</option>
            <option value={"compact"}>{"One line"}</option>
            <option value={"registry"}>{"Schema Registry body"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Sample JSON"}</label>
                <ToolInput
                  as="code"
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  language="json"
                  placeholder={"Paste a JSON object, an array of objects, or NDJSON"}
                  aria-label={"Sample JSON"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"Avro schema"} fileName={"schema.avsc"} value={result.output} error={result.error?.message ?? null} placeholder={"The inferred schema appears here"} />}
        />
      </div>
    </div>
  );
}
