"use client";

import { useMemo, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { convertJsonXml } from "./transform";
import type { JsonXmlOptions } from "./schema";

export function JsonXmlToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<JsonXmlOptions>({
    mode: "json-to-xml",
    indent: 2,
    rootName: "root",
  });

  const result = useMemo(() => convertJsonXml(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          <Button
            variant={options.mode === "json-to-xml" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "json-to-xml" }))}
          >
            JSON → XML
          </Button>
          <Button
            variant={options.mode === "xml-to-json" ? "primary" : "ghost"}
            size="sm"
            className="rounded-none"
            onClick={() => setOptions((o) => ({ ...o, mode: "xml-to-json" }))}
          >
            XML → JSON
          </Button>
        </div>
        {options.mode === "json-to-xml" && (
          <label className="flex items-center gap-1.5 text-sm text-text-secondary">
            Root tag
            <input
              value={options.rootName}
              onChange={(e) => setOptions((o) => ({ ...o, rootName: e.target.value || "root" }))}
              className="w-28 rounded-sm border border-border-default bg-bg-raised px-2 py-1"
            />
          </label>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">
                {options.mode === "json-to-xml" ? "JSON" : "XML"}
              </label>
              <Textarea value={input} onChange={(e) => setInput(e.target.value)} aria-label="Input" />
            </div>
          }
          output={
            <OutputPane
              label={options.mode === "json-to-xml" ? "XML" : "JSON"}
              value={result.output}
              error={result.error?.message ?? null}
            />
          }
        />
      </div>
    </div>
  );
}
