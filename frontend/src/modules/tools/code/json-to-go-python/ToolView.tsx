"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { jsonToGoPython } from "./transform";
import type { JsonToGoPythonOptions } from "./schema";

type Options = JsonToGoPythonOptions;

const defaultOptions: Options = {"target":"go","omitEmpty":true,"pointerForNullable":true} as Options;

export function JsonToGoPythonToolView() {
  const [input, setInput] = useState("name: Order\n{\"id\":1,\"user_name\":\"ann\",\"score\":9.5,\"tags\":[\"a\",\"b\"],\"address\":{\"city\":\"X\",\"zip\":null},\"items\":[{\"sku\":\"a\",\"qty\":1},{\"sku\":\"b\",\"note\":\"n\"}]}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => jsonToGoPython(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Output
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.target}
            onChange={(e) => setOptions((o) => ({ ...o, target: e.target.value as Options["target"] }))}
          >
            <option value="go">{"Go struct"}</option>
            <option value="python-dataclass">{"Python dataclass"}</option>
            <option value="python-pydantic">{"Pydantic model"}</option>
            <option value="python-typeddict">{"TypedDict"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.omitEmpty} onChange={(e) => setOptions((o) => ({ ...o, omitEmpty: e.target.checked }))} />
          Go omitempty on optional
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.pointerForNullable} onChange={(e) => setOptions((o) => ({ ...o, pointerForNullable: e.target.checked }))} />
          Go pointers for optional
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">JSON (optional first line: name: RootType)</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"name: User\n{\"id\":1,\"name\":\"Ann\"}"}
                aria-label="JSON (optional first line: name: RootType)"
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
