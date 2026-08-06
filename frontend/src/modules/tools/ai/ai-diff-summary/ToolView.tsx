"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { AiDisclosureBanner } from "@/components/tools/AiDisclosureBanner";
import { ApiClientError } from "@/lib/api-client";
import { summarizeDiff } from "./transform";

type Format = "text" | "json";

export function AiDiffSummaryToolView() {
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [format, setFormat] = useState<Format>("text");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  async function handleSummarize() {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const result = await summarizeDiff({ before, after, format });
      setSummary(result.summary);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't summarize this diff. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <AiDisclosureBanner detail="both versions of the text below" />

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-text-secondary">Format</span>
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as Format)}
          aria-label="Diff format"
          className="rounded-sm border border-border-default bg-bg-raised px-2 py-1.5 text-sm outline-none focus-visible:border-accent"
        >
          <option value="text">Plain text</option>
          <option value="json">JSON</option>
        </select>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary" htmlFor="ai-diff-before">
            Before
          </label>
          <Textarea id="ai-diff-before" value={before} onChange={(e) => setBefore(e.target.value)} className="h-40" />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary" htmlFor="ai-diff-after">
            After
          </label>
          <Textarea id="ai-diff-after" value={after} onChange={(e) => setAfter(e.target.value)} className="h-40" />
        </div>
      </div>

      <Button onClick={handleSummarize} disabled={loading || !before.trim() || !after.trim()} className="self-start">
        {loading ? "Summarizing…" : "Summarize changes"}
      </Button>

      <div className="min-h-0 flex-1">
        <OutputPane
          label="Summary"
          value={summary ?? ""}
          error={error}
          placeholder="A plain-language summary of what changed will appear here."
        />
      </div>
    </div>
  );
}
