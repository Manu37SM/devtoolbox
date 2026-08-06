"use client";

import { useState } from "react";
import type { AiGenerateResult } from "@devtoolbox/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { OutputPane } from "@/components/tools/OutputPane";
import { AiDisclosureBanner } from "@/components/tools/AiDisclosureBanner";
import { ApiClientError } from "@/lib/api-client";
import { generateFromExample } from "./transform";
import { generateFromExampleTargets, type GenerateFromExampleTarget } from "./schema";

const TARGET_LABEL: Record<GenerateFromExampleTarget, string> = {
  regex: "Regular expression",
  "json-schema": "JSON Schema",
};

const PLACEHOLDER: Record<GenerateFromExampleTarget, string> = {
  regex: "555-123-4567\n800-555-0199",
  "json-schema": '{\n  "id": 1,\n  "name": "Ada Lovelace",\n  "active": true\n}',
};

export function GenerateFromExampleToolView() {
  const [target, setTarget] = useState<GenerateFromExampleTarget>("regex");
  const [sample, setSample] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiGenerateResult | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await generateFromExample({ target, sample }));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't generate a result. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <AiDisclosureBanner detail="the example data below" />

      <div className="flex gap-2">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value as GenerateFromExampleTarget)}
          aria-label="Generate"
          className="rounded-sm border border-border-default bg-bg-raised px-2 py-2 text-sm outline-none focus-visible:border-accent"
        >
          {generateFromExampleTargets.map((t) => (
            <option key={t} value={t}>
              {TARGET_LABEL[t]}
            </option>
          ))}
        </select>
        <Button onClick={handleGenerate} disabled={loading || !sample.trim()}>
          {loading ? "Generating…" : "Generate"}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary" htmlFor="generate-from-example-sample">
          {target === "regex" ? "Example strings it should match (one per line)" : "Sample JSON document"}
        </label>
        <Textarea
          id="generate-from-example-sample"
          value={sample}
          onChange={(e) => setSample(e.target.value)}
          placeholder={PLACEHOLDER[target]}
          className="h-28 font-mono"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : result ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Badge variant={result.validated ? "success" : "warning"}>
                {result.validated ? "Confirmed" : "Not confirmed"}
              </Badge>
              {result.validationNote && <span className="text-xs text-text-muted">{result.validationNote}</span>}
            </div>
            <div className="h-24">
              <OutputPane label={TARGET_LABEL[target]} value={result.result} />
            </div>
            <p className="text-sm text-text-secondary">{result.explanation}</p>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Paste example data above and click Generate.</p>
        )}
      </div>
    </div>
  );
}
