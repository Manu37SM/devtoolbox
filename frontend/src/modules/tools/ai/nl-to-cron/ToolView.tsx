"use client";

import { useState } from "react";
import type { AiGenerateResult } from "@devtoolbox/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { OutputPane } from "@/components/tools/OutputPane";
import { AiDisclosureBanner } from "@/components/tools/AiDisclosureBanner";
import { ApiClientError } from "@/lib/api-client";
import { generateCron } from "./transform";

export function NlToCronToolView() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiGenerateResult | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await generateCron({ prompt }));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't generate a cron expression. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <AiDisclosureBanner detail="the description below" />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary" htmlFor="nl-to-cron-prompt">
          Describe the schedule
        </label>
        <Textarea
          id="nl-to-cron-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. every weekday at 9am UTC"
          className="h-20"
        />
      </div>

      <Button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="self-start">
        {loading ? "Generating…" : "Generate cron expression"}
      </Button>

      <div className="min-h-0 flex-1 overflow-auto">
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : result ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Badge variant={result.validated ? "success" : "warning"}>
                {result.validated ? "Validated" : "Couldn't validate"}
              </Badge>
              {result.validationNote && <span className="text-xs text-text-muted">{result.validationNote}</span>}
            </div>
            <div className="h-16">
              <OutputPane label="Cron expression" value={result.result} />
            </div>
            <p className="text-sm text-text-secondary">{result.explanation}</p>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Describe a schedule above and click Generate.</p>
        )}
      </div>
    </div>
  );
}
