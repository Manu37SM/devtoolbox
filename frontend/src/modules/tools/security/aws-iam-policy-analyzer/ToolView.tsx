"use client";

import { useMemo, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { ToolInput } from "@/components/tools/ToolInput";

import { runAwsIamPolicyAnalyzer } from "./transform";
import type { AwsIamPolicyAnalyzerOptions } from "./schema";

type Options = AwsIamPolicyAnalyzerOptions;

const defaultOptions: Options = {"minSeverity":"info"} as Options;

export function AwsIamPolicyAnalyzerToolView() {
  const [input, setInput] = useState("{\n  \"Version\": \"2012-10-17\",\n  \"Statement\": [\n    { \"Sid\": \"Deploy\", \"Effect\": \"Allow\", \"Action\": [\"s3:*\", \"iam:PassRole\", \"lambda:UpdateFunctionCode\"], \"Resource\": \"*\" },\n    { \"Sid\": \"PublicRead\", \"Effect\": \"Allow\", \"Principal\": \"*\", \"Action\": \"s3:GetObject\", \"Resource\": \"arn:aws:s3:::acme-site/*\" }\n  ]\n}");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const result = useMemo(() => runAwsIamPolicyAnalyzer(input, options), [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Show
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.minSeverity}
            onChange={(e) => setOptions((o) => ({ ...o, minSeverity: e.target.value as Options["minSeverity"] }))}
          >
            <option value="info">{"Everything"}</option>
            <option value="warning">{"Warnings and errors"}</option>
            <option value="error">{"Errors only"}</option>
          </select>
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Policy JSON</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"{\"Version\": \"2012-10-17\", \"Statement\": [...]}"}
                aria-label="Policy JSON"
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
