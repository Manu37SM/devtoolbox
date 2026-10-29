"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runProtoToTypescript } from "./transform";
import type { ProtoToTypescriptOptions } from "./schema";

type Options = ProtoToTypescriptOptions;

const defaultOptions: Options = {"output":"typescript","enumStyle":"union","int64":"string"} as Options;

export function ProtoToTypescriptToolView() {
  const [input, setInput] = useState("syntax = \"proto3\";\npackage acme.orders.v1;\nimport \"google/protobuf/timestamp.proto\";\n\nmessage Order {\n  string order_id = 1;\n  int64 amount_minor = 2;\n  Status status = 3;\n  repeated LineItem items = 4;\n  map<string, string> labels = 5;\n  google.protobuf.Timestamp created_at = 6;\n  oneof payment {\n    string upi_id = 7;\n    string card_token = 8;\n  }\n  message LineItem { string sku = 1; uint32 qty = 2; }\n  enum Status { STATUS_UNSPECIFIED = 0; PLACED = 1; PAID = 2; }\n}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runProtoToTypescript(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.output}
            onChange={(e) => setOptions((o) => ({ ...o, output: e.target.value as Options["output"] }))}
          >
            <option value="typescript">{"TypeScript"}</option>
            <option value="json">{"JSON sample"}</option>
          </select>
        </label>
        {options.output === "typescript" && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Enums
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.enumStyle}
            onChange={(e) => setOptions((o) => ({ ...o, enumStyle: e.target.value as Options["enumStyle"] }))}
          >
            <option value="union">{"String unions"}</option>
            <option value="enum">{"TS enums"}</option>
          </select>
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          64-bit ints
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.int64}
            onChange={(e) => setOptions((o) => ({ ...o, int64: e.target.value as Options["int64"] }))}
          >
            <option value="string">{"string (proto3 JSON)"}</option>
            <option value="number">{"number"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">.proto file</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"syntax = \"proto3\";"}
                aria-label=".proto file"
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
