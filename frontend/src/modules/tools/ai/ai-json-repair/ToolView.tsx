"use client";

import { useState } from "react";
import type { AiJsonRepairResult } from "@devtoolbox/shared";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { OutputPane } from "@/components/tools/OutputPane";
import { AiDisclosureBanner } from "@/components/tools/AiDisclosureBanner";
import { ApiClientError } from "@/lib/api-client";
import { repairJson } from "./transform";

export function AiJsonRepairToolView() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiJsonRepairResult | null>(null);

  async function handleRepair() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await repairJson({ input }));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't repair this JSON. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <AiDisclosureBanner detail="the malformed JSON below (only if it can't be fixed automatically without AI)" />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary" htmlFor="ai-json-repair-input">
          Malformed JSON
        </label>
        <Textarea
          id="ai-json-repair-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='{name: "value", list: [1, 2, 3,]}'
          className="h-40 font-mono"
        />
      </div>

      <Button onClick={handleRepair} disabled={loading || !input.trim()} className="self-start">
        {loading ? "Repairing…" : "Repair JSON"}
      </Button>

      <div className="min-h-0 flex-1 overflow-auto">
        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : result ? (
          <div className="flex h-full flex-col gap-2">
            <div>
              <Badge variant={result.repairedBy === "deterministic" ? "neutral" : "success"}>
                {result.repairedBy === "deterministic" ? "Fixed without AI" : "Fixed with AI assistance"}
              </Badge>
            </div>
            <div className="min-h-0 flex-1">
              <OutputPane label="Repaired JSON" value={result.repaired} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Paste malformed JSON above and click Repair.</p>
        )}
      </div>
    </div>
  );
}
