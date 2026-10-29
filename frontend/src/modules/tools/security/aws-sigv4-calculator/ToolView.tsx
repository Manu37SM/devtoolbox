"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";

import { runAwsSigv4Calculator } from "./transform";
import type { AwsSigv4CalculatorOptions } from "./schema";
import type { TransformResult } from "@/lib/tool-transform";

type Options = AwsSigv4CalculatorOptions;

const defaultOptions: Options = {"mode":"header","unsignedPayload":false,"showSteps":true} as Options;

export function AwsSigv4CalculatorToolView() {
  const [input, setInput] = useState("method: GET\nurl: https://iam.amazonaws.com/?Action=ListUsers&Version=2010-05-08\nregion: us-east-1\nservice: iam\naccess-key: AKIDEXAMPLE\nsecret-key: wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY\ndate: 20150830T123600Z\nheader: Content-Type: application/x-www-form-urlencoded; charset=utf-8");
  const [options, setOptions] = useState<Options>(defaultOptions);

  const [result, setResult] = useState<TransformResult>({ output: "", error: null });
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    void runAwsSigv4Calculator(input, options).then((next) => {
      if (id === requestId.current) setResult(next);
    });
  }, [input, options]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Mode
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.mode}
            onChange={(e) => setOptions((o) => ({ ...o, mode: e.target.value as Options["mode"] }))}
          >
            <option value="header">{"Authorization header"}</option>
            <option value="presigned">{"Presigned URL"}</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.unsignedPayload} onChange={(e) => setOptions((o) => ({ ...o, unsignedPayload: e.target.checked }))} />
          UNSIGNED-PAYLOAD
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input type="checkbox" checked={options.showSteps} onChange={(e) => setOptions((o) => ({ ...o, showSteps: e.target.checked }))} />
          Show steps
        </label>
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Fields (then a blank line and the body)</label>
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={"method: GET\nurl: https://..."}
                aria-label="Fields (then a blank line and the body)"
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
