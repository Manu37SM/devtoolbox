"use client";

import { useMemo, useState } from "react";
import { CodeEditor, type CodeEditorLanguage } from "@/components/ui/CodeEditor";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { generateCodeDiff } from "./transform";
import type { CodeDiffOptions } from "./schema";

const LANGUAGES: { value: CodeDiffOptions["language"]; label: string }[] = [
  { value: "javascript", label: "JavaScript" },
  { value: "json", label: "JSON" },
  { value: "css", label: "CSS" },
  { value: "html", label: "HTML" },
  { value: "xml", label: "XML" },
  { value: "yaml", label: "YAML" },
  { value: "markdown", label: "Markdown" },
  { value: "other", label: "Other (plain text)" },
];

export function CodeDiffToolView() {
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [options, setOptions] = useState<CodeDiffOptions>({
    language: "javascript",
    ignoreWhitespace: false,
    ignoreCase: false,
  });

  const result = useMemo(() => generateCodeDiff(before, after, options), [before, after, options]);
  const editorLanguage: CodeEditorLanguage | undefined =
    options.language === "other" ? undefined : options.language;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={options.language}
          onChange={(e) => setOptions((o) => ({ ...o, language: e.target.value as CodeDiffOptions["language"] }))}
          className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 text-sm"
          aria-label="Language"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.ignoreWhitespace}
            onChange={(e) => setOptions((o) => ({ ...o, ignoreWhitespace: e.target.checked }))}
          />
          Ignore whitespace
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={options.ignoreCase}
            onChange={(e) => setOptions((o) => ({ ...o, ignoreCase: e.target.checked }))}
          />
          Ignore case
        </label>
        <Badge variant="success">+{result.stats.additions}</Badge>
        <Badge variant="danger">-{result.stats.removals}</Badge>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="flex min-h-[200px] flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary">Before</label>
          {editorLanguage ? (
            <CodeEditor value={before} onChange={(e) => setBefore(e.target.value)} language={editorLanguage} aria-label="Before code" />
          ) : (
            <Textarea value={before} onChange={(e) => setBefore(e.target.value)} aria-label="Before code" />
          )}
        </div>
        <div className="flex min-h-[200px] flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary">After</label>
          {editorLanguage ? (
            <CodeEditor value={after} onChange={(e) => setAfter(e.target.value)} language={editorLanguage} aria-label="After code" />
          ) : (
            <Textarea value={after} onChange={(e) => setAfter(e.target.value)} aria-label="After code" />
          )}
        </div>
      </div>

      <div className="flex min-h-[140px] flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary">Diff</label>
        <pre
          aria-live="polite"
          className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border-default bg-bg-raised p-3 font-mono text-sm"
        >
          {result.ops.length === 0 && (
            <span className="text-text-muted">Diff will appear here</span>
          )}
          {result.ops.map((op, i) => (
            <div
              key={i}
              className={
                op.type === "add"
                  ? "bg-success/15 text-success"
                  : op.type === "remove"
                    ? "bg-danger/15 text-danger"
                    : "text-text-primary"
              }
            >
              {(op.type === "add" ? "+ " : op.type === "remove" ? "- " : "  ") + op.value}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
