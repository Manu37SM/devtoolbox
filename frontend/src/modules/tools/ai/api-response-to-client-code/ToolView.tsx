"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { AiDisclosureBanner } from "@/components/tools/AiDisclosureBanner";
import { ApiClientError } from "@/lib/api-client";
import { generateClientCode } from "./transform";
import { apiResponseToClientCodeTargets, type ApiResponseToClientCodeTarget } from "./schema";

const TARGET_LABEL: Record<ApiResponseToClientCodeTarget, string> = {
  fetch: "fetch",
  axios: "axios",
};

export function ApiResponseToClientCodeToolView() {
  const [sampleResponse, setSampleResponse] = useState("");
  const [target, setTarget] = useState<ApiResponseToClientCodeTarget>("fetch");
  const [typeName, setTypeName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setCode(null);
    try {
      const result = await generateClientCode({ sampleResponse, target, typeName: typeName.trim() || undefined });
      setCode(result.code);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't generate client code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <AiDisclosureBanner detail="the sample response below" />

      <div className="flex gap-2">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value as ApiResponseToClientCodeTarget)}
          aria-label="Client style"
          className="rounded-sm border border-border-default bg-bg-raised px-2 py-2 text-sm outline-none focus-visible:border-accent"
        >
          {apiResponseToClientCodeTargets.map((t) => (
            <option key={t} value={t}>
              {TARGET_LABEL[t]}
            </option>
          ))}
        </select>
        <Input
          value={typeName}
          onChange={(e) => setTypeName(e.target.value)}
          placeholder="Response type name (optional)"
          aria-label="Response type name"
          className="max-w-56"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary" htmlFor="api-response-to-client-code-sample">
          Sample JSON response
        </label>
        <Textarea
          id="api-response-to-client-code-sample"
          value={sampleResponse}
          onChange={(e) => setSampleResponse(e.target.value)}
          placeholder='{\n  "id": 1,\n  "name": "Ada Lovelace"\n}'
          className="h-32 font-mono"
        />
      </div>

      <Button onClick={handleGenerate} disabled={loading || !sampleResponse.trim()} className="self-start">
        {loading ? "Generating…" : "Generate client code"}
      </Button>

      <div className="min-h-0 flex-1">
        <OutputPane label="Client code" value={code ?? ""} error={error} placeholder="Generated client code will appear here." />
      </div>
    </div>
  );
}
