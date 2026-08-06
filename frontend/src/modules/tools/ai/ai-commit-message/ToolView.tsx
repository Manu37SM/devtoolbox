"use client";

import { useState } from "react";
import type { AiCommitMessageResult } from "@devtoolbox/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { AiDisclosureBanner } from "@/components/tools/AiDisclosureBanner";
import { ApiClientError } from "@/lib/api-client";
import { generateCommitMessage } from "./transform";

export function AiCommitMessageToolView() {
  const [diff, setDiff] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiCommitMessageResult | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await generateCommitMessage({ diff }));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't generate a commit message. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <AiDisclosureBanner detail="the diff below" />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary" htmlFor="ai-commit-message-diff">
          Git diff
        </label>
        <Textarea
          id="ai-commit-message-diff"
          value={diff}
          onChange={(e) => setDiff(e.target.value)}
          placeholder={"--- a/src/parser.ts\n+++ b/src/parser.ts\n@@ -12,6 +12,9 @@"}
          className="h-40 font-mono"
        />
      </div>

      <Button onClick={handleGenerate} disabled={loading || !diff.trim()} className="self-start">
        {loading ? "Generating…" : "Generate commit message"}
      </Button>

      <div className="min-h-0 flex-1 overflow-auto">
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : result ? (
          <div className="flex flex-col gap-3">
            <div className="h-10">
              <OutputPane label="Commit message" value={result.commitMessage} />
            </div>
            <div className="h-28">
              <OutputPane label="PR description" value={result.prDescription} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Paste a diff above and click Generate.</p>
        )}
      </div>
    </div>
  );
}
