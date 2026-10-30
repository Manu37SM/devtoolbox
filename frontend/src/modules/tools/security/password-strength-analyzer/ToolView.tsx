"use client";

import { useMemo, useState } from "react";
import { analyzePassword } from "./transform";
import { passwordStrengthOptionsSchema, type PasswordStrengthOptions, type PasswordStrengthScore } from "./schema";

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

  const [options, setOptions] = useState<PasswordStrengthOptions>(() => passwordStrengthOptionsSchema.parse({}));
  const result = useMemo(() => analyzePassword(password, options), [password, options]);

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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Attack
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.scenario}
            onChange={(e) => setOptions((o) => ({ ...o, scenario: e.target.value as PasswordStrengthOptions["scenario"] }))}
          >
            <option value="offline-fast">Offline, fast hash (MD5/SHA-1)</option>
            <option value="offline-slow">Offline, bcrypt/Argon2</option>
            <option value="online">Online, no rate limit</option>
            <option value="online-throttled">Online, rate-limited</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Policy
          <select
            className="rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            value={options.policy}
            onChange={(e) => setOptions((o) => ({ ...o, policy: e.target.value as PasswordStrengthOptions["policy"] }))}
          >
            <option value="none">None</option>
            <option value="nist">NIST SP 800-63B</option>
            <option value="pci">PCI DSS 4.0</option>
            <option value="custom">Custom minimum length</option>
          </select>
        </label>
        {options.policy === "custom" && (
          <label className="flex items-center gap-1.5 text-sm text-text-secondary">
            Min length
            <input
              type="number"
              min={1}
              max={128}
              value={options.customMinLength}
              onChange={(e) => setOptions((o) => ({ ...o, customMinLength: Math.min(128, Math.max(1, Number(e.target.value) || 0)) }))}
              className="w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1"
            />
          </label>
        )}
        <label className="flex items-center gap-1.5 text-sm text-text-secondary">
          Personal words
          <input
            type="text"
            value={options.userInputs}
            placeholder="name, company, email"
            onChange={(e) => setOptions((o) => ({ ...o, userInputs: e.target.value }))}
            className="w-56 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1 font-mono text-sm"
          />
        </label>
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

      {password && result.policy && (
        <div
          role="status"
          className={`rounded-md border p-2 text-sm ${result.policy.passed ? "border-success/40 text-success" : "border-danger/40 text-danger"}`}
        >
          {result.policy.name}: {result.policy.passed ? "meets the policy" : "does not meet the policy"}
          {result.policy.failures.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {result.policy.failures.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {password && result.crackTimes && (
        <table className="w-full text-sm">
          <tbody className="divide-y divide-border-subtle">
            {result.crackTimes.map((c) => (
              <tr key={c.scenario} className={c.scenario === options.scenario ? "font-medium text-text-primary" : "text-text-secondary"}>
                <td className="py-1">{c.label}</td>
                <td className="py-1 text-right font-mono">{c.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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
