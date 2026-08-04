"use client";

import { useMemo, useState } from "react";
import { analyzePassword } from "./transform";
import type { PasswordStrengthScore } from "./schema";

const SCORE_BAR_COLOR: Record<PasswordStrengthScore, string> = {
  0: "bg-red-500",
  1: "bg-orange-500",
  2: "bg-yellow-500",
  3: "bg-lime-500",
  4: "bg-green-500",
};

const SCORE_TEXT_COLOR: Record<PasswordStrengthScore, string> = {
  0: "text-red-500",
  1: "text-orange-500",
  2: "text-yellow-500",
  3: "text-lime-600",
  4: "text-green-600",
};

export function PasswordStrengthAnalyzerToolView() {
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);

  const result = useMemo(() => analyzePassword(password), [password]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary" htmlFor="password-strength-input">
          Password
        </label>
        <div className="flex items-center gap-2">
          <input
            id="password-strength-input"
            type={visible ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Password to analyze"
            placeholder="Type a password to analyze"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-sm border border-border-default bg-bg-raised px-2 py-1.5 font-mono text-sm"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="shrink-0 rounded-sm border border-border-default px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-raised"
          >
            {visible ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-bg-raised">
          <div
            className={`h-full transition-all duration-fast ${SCORE_BAR_COLOR[result.score]}`}
            style={{ width: `${((result.score + 1) / 5) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className={`font-medium ${SCORE_TEXT_COLOR[result.score]}`}>{result.label}</span>
          <span className="text-text-secondary">
            ~{result.entropyBits} bits entropy · crack time: {result.crackTimeEstimate}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-md border border-border-default p-3">
        <p className="mb-2 text-sm font-medium text-text-secondary">Feedback</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-text-primary">
          {result.feedback.map((item, i) => (
            <li key={`${item}-${i}`}>{item}</li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-text-secondary">
        Your password is analyzed entirely in your browser and is never transmitted anywhere.
      </p>
    </div>
  );
}
