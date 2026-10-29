"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runJavaClassToJson } from "./transform";
import type { JavaClassToJsonOptions } from "./schema";

type Options = JavaClassToJsonOptions;

const defaultOptions: Options = {"output":"both","naming":"as-is"} as Options;

export function JavaClassToJsonToolView() {
  const [input, setInput] = useState("public class Order {\n    private Long id;\n    @JsonProperty(\"customer_email\") private String email;\n    private BigDecimal total;\n    private Status status;\n    private List<Line> lines;\n    private OffsetDateTime placedAt;\n    @JsonIgnore private String internalNote;\n\n    public enum Status { PLACED, PAID, SHIPPED }\n}\n\nrecord Line(String sku, int quantity, BigDecimal price) {}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runJavaClassToJson(input, options), [input, options]);

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
            <option value="both">{"JSON + TypeScript"}</option>
            <option value="json">{"JSON sample"}</option>
            <option value="typescript">{"TypeScript"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Property names
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.naming}
            onChange={(e) => setOptions((o) => ({ ...o, naming: e.target.value as Options["naming"] }))}
          >
            <option value="as-is">{"As declared"}</option>
            <option value="snake">{"snake_case"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Java source</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="public class Order { ... }"
                aria-label="Java source"
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
