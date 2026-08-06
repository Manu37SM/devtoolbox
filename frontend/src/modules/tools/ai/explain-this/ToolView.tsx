"use client";

import { useState } from "react";
import type { AiExplainSubject } from "@devtoolbox/shared";
import { AiExplainSubjects } from "@devtoolbox/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { AiDisclosureBanner } from "@/components/tools/AiDisclosureBanner";
import { ApiClientError } from "@/lib/api-client";
import { explainExpression } from "./transform";

const SUBJECT_LABEL: Record<AiExplainSubject, string> = {
  regex: "Regex",
  cron: "Cron expression",
  "json-schema": "JSON Schema",
  sql: "SQL query",
};

export function ExplainThisToolView() {
  const [subject, setSubject] = useState<AiExplainSubject>("regex");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);

  async function handleExplain() {
    setLoading(true);
    setError(null);
    setExplanation(null);
    try {
      const result = await explainExpression({ subject, input });
      setExplanation(result.explanation);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't get an explanation. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <AiDisclosureBanner detail="the expression below" />

      <div className="flex gap-2">
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value as AiExplainSubject)}
          aria-label="Expression type"
          className="rounded-sm border border-border-default bg-bg-raised px-2 py-2 text-sm outline-none focus-visible:border-accent"
        >
          {AiExplainSubjects.map((s) => (
            <option key={s} value={s}>
              {SUBJECT_LABEL[s]}
            </option>
          ))}
        </select>
        <Button onClick={handleExplain} disabled={loading || !input.trim()}>
          {loading ? "Explaining…" : "Explain"}
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary" htmlFor="explain-this-input">
          {SUBJECT_LABEL[subject]}
        </label>
        <Textarea
          id="explain-this-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Paste a ${SUBJECT_LABEL[subject].toLowerCase()} to explain…`}
          className="h-28 font-mono"
        />
      </div>

      <div className="min-h-0 flex-1">
        <OutputPane
          label="Explanation"
          value={explanation ?? ""}
          error={error}
          placeholder="The plain-language explanation will appear here."
        />
      </div>
    </div>
  );
}
