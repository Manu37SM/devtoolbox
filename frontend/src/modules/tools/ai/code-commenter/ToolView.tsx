"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OutputPane } from "@/components/tools/OutputPane";
import { AiDisclosureBanner } from "@/components/tools/AiDisclosureBanner";
import { ApiClientError } from "@/lib/api-client";
import { commentCode } from "./transform";

export function CodeCommenterToolView() {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commented, setCommented] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setCommented(null);
    try {
      const result = await commentCode({ code, language: language.trim() || undefined });
      setCommented(result.commented);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Couldn't add comments. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <AiDisclosureBanner detail="the code below" />

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary" htmlFor="code-commenter-language">
          Language (optional)
        </label>
        <Input
          id="code-commenter-language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          placeholder="typescript"
          className="max-w-40"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary" htmlFor="code-commenter-code">
          Code
        </label>
        <Textarea
          id="code-commenter-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={"function add(a, b) {\n  return a + b;\n}"}
          className="h-40 font-mono"
        />
      </div>

      <Button onClick={handleGenerate} disabled={loading || !code.trim()} className="self-start">
        {loading ? "Commenting…" : "Add comments"}
      </Button>

      <div className="min-h-0 flex-1">
        <OutputPane label="Commented code" value={commented ?? ""} error={error} placeholder="Commented code will appear here." />
      </div>
    </div>
  );
}
