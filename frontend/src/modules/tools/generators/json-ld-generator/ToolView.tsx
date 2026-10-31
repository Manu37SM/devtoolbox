"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";
import { jsonLdGenerator } from "./transform";
import type { JsonLdGeneratorOptions } from "./schema";

type Options = JsonLdGeneratorOptions;

const defaultOptions: Options = {"type": "Article", "businessType": "LocalBusiness", "authorType": "Person", "format": "script", "numbers": true, "context": true} as Options;

export function JsonLdGeneratorToolView() {
  const [in0, setIn0] = useState("headline: How to Tune PostgreSQL\nauthor: Jane Doe\ndatePublished: 2026-03-04\nimage: https://example.com/cover.jpg");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => jsonLdGenerator(in0, options), [in0, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Type"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.type} onChange={(e) => setOptions((o) => ({ ...o, type: e.target.value as Options["type"] }))}>
            <option value={"Article"}>{"Article"}</option>
            <option value={"NewsArticle"}>{"NewsArticle"}</option>
            <option value={"BlogPosting"}>{"BlogPosting"}</option>
            <option value={"Product"}>{"Product"}</option>
            <option value={"Organization"}>{"Organization"}</option>
            <option value={"LocalBusiness"}>{"LocalBusiness"}</option>
            <option value={"Person"}>{"Person"}</option>
            <option value={"WebSite"}>{"WebSite"}</option>
            <option value={"BreadcrumbList"}>{"BreadcrumbList"}</option>
            <option value={"FAQPage"}>{"FAQPage"}</option>
            <option value={"Event"}>{"Event"}</option>
            <option value={"Recipe"}>{"Recipe"}</option>
            <option value={"VideoObject"}>{"VideoObject"}</option>
            <option value={"JobPosting"}>{"JobPosting"}</option>
            <option value={"SoftwareApplication"}>{"SoftwareApplication"}</option>
          </select>
        </label>
        {["LocalBusiness"].includes(String(options.type)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Business type"}
          <input type="text" value={options.businessType} placeholder={"Restaurant"} onChange={(e) => setOptions((o) => ({ ...o, businessType: e.target.value }))} className="w-32 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm" />
        </label>
        )}
        {["Article", "NewsArticle", "BlogPosting", "Recipe", "VideoObject"].includes(String(options.type)) && (
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Author is"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.authorType} onChange={(e) => setOptions((o) => ({ ...o, authorType: e.target.value as Options["authorType"] }))}>
            <option value={"Person"}>{"Person"}</option>
            <option value={"Organization"}>{"Organization"}</option>
          </select>
        </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          {"Output"}
          <select className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1" value={options.format} onChange={(e) => setOptions((o) => ({ ...o, format: e.target.value as Options["format"] }))}>
            <option value={"script"}>{"<script> tag"}</option>
            <option value={"json"}>{"JSON"}</option>
            <option value={"minified"}>{"Minified tag"}</option>
            <option value={"checks"}>{"Checks only"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.numbers} onChange={(e) => setOptions((o) => ({ ...o, numbers: e.target.checked }))} />
          {"Numbers as numbers"}
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.context} onChange={(e) => setOptions((o) => ({ ...o, context: e.target.checked }))} />
          {"@context"}
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-3">
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <label className="text-sm font-medium text-text-secondary">{"Properties (property: value, one per line; leave empty for a sample)"}</label>
                <ToolInput
                  value={in0}
                  onChange={(e) => setIn0(e.target.value)}
                  placeholder={"headline: ..."}
                  aria-label={"Properties (property: value, one per line; leave empty for a sample)"}
                  className="font-mono"
                />
              </div>
            </div>
          }
          output={<OutputPane label={"JSON-LD"} value={result.output} error={result.error?.message ?? null} placeholder={"Enter properties, or clear the box for a sample"} />}
        />
      </div>
    </div>
  );
}
