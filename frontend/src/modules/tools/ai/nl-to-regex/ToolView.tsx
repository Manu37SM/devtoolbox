"use client";

import { useState } from "react";
import type { AiGenerateResult } from "@devtoolbox/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { OutputPane } from "@/components/tools/OutputPane";
import { AiDisclosureBanner } from "@/components/tools/AiDisclosureBanner";
import { ApiClientError } from "@/lib/api-client";
import { generateRegex } from "./transform";

export function NlToRegexToolView() {
  const [prompt, setPrompt] = useState("");
  const [examplesText, setExamplesText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiGenerateResult | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const examples = examplesText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 10);
      setResult(await generateRegex({ prompt, examples: examples.length ? examples : undefined }));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't generate a regex. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <AiDisclosureBanner detail="the description and example strings below" />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary" htmlFor="nl-to-regex-prompt">
          Describe what to match
        </label>
        <Textarea
          id="nl-to-regex-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. a US phone number like 555-123-4567"
          className="h-16"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary" htmlFor="nl-to-regex-examples">
          Example strings it should match (one per line, optional but strongly recommended)
        </label>
        <Textarea
          id="nl-to-regex-examples"
          value={examplesText}
          onChange={(e) => setExamplesText(e.target.value)}
          placeholder={"555-123-4567\n800-555-0199"}
          className="h-20 font-mono"
        />
      </div>

      <Button onClick={handleGenerate} disabled={loading || !prompt.trim()} className="self-start">
        {loading ? "Generating…" : "Generate regex"}
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
                {result.validated ? "Confirmed" : "Not confirmed"}
              </Badge>
              {result.validationNote && <span className="text-xs text-text-muted">{result.validationNote}</span>}
            </div>
            <div className="h-16">
              <OutputPane label="Regular expression" value={result.result} />
            </div>
            <p className="text-sm text-text-secondary">{result.explanation}</p>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Describe a pattern above and click Generate.</p>
        )}
      </div>
    </div>
  );
}
