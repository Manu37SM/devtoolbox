"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runJsonSchemaValidator } from "./transform";
import type { JsonSchemaValidatorOptions } from "./schema";

type Options = JsonSchemaValidatorOptions;

const defaultOptions: Options = {"assertFormats":true} as Options;

export function JsonSchemaValidatorToolView() {
  const [input, setInput] = useState("{\n  \"id\": 0,\n  \"email\": \"not-an-email\",\n  \"items\": [{ \"sku\": \"x1\", \"qty\": 0 }],\n  \"extra\": true\n}");
  const [input2, setInput2] = useState("{\n  \"$schema\": \"https://json-schema.org/draft/2020-12/schema\",\n  \"type\": \"object\",\n  \"required\": [\"id\", \"email\", \"items\"],\n  \"additionalProperties\": false,\n  \"properties\": {\n    \"id\": { \"type\": \"integer\", \"minimum\": 1 },\n    \"email\": { \"type\": \"string\", \"format\": \"email\" },\n    \"items\": { \"type\": \"array\", \"minItems\": 1, \"items\": { \"$ref\": \"#/$defs/item\" } }\n  },\n  \"$defs\": {\n    \"item\": { \"type\": \"object\", \"required\": [\"sku\", \"qty\"], \"properties\": { \"sku\": { \"type\": \"string\", \"pattern\": \"^[A-Z]{2}\\\\d+$\" }, \"qty\": { \"type\": \"integer\", \"exclusiveMinimum\": 0 } } }\n  }\n}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runJsonSchemaValidator(input, input2, options), [input, input2, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.assertFormats} onChange={(e) => setOptions((o) => ({ ...o, assertFormats: e.target.checked }))} />
          Check formats (email, date, uuid...)
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">JSON data</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"{\"id\": 1}"}
                aria-label="JSON data"
                className="font-mono h-auto min-h-[120px] flex-1"
              />
              <label className="text-sm font-medium text-text-secondary">JSON Schema</label>
              <Textarea
                value={input2}
                onChange={(e) => setInput2(e.target.value)}
                placeholder={"{\"type\": \"object\"}"}
                aria-label="JSON Schema"
                className="h-auto min-h-[120px] flex-1 font-mono"
              />
            </div>
          }
          output={<OutputPane label="Output" value={result.output} error={result.error?.message ?? null} placeholder="Result will appear here" />}
        />
      </div>
    </div>
  );
}
