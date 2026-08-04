"use client";

import { useMemo, useState } from "react";
import { REGEX_PATTERNS, filterPatterns } from "./transform";

export function RegexCheatsheetToolView() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => filterPatterns(REGEX_PATTERNS, query), [query]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-text-secondary" htmlFor="regex-search">
          Search patterns
        </label>
        <input
          id="regex-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by symbol or keyword, e.g. lookahead, digit, anchor"
          aria-label="Search regex patterns"
          className="w-full rounded-sm border border-border-default bg-bg-raised px-3 py-2 text-sm outline-none focus-visible:border-accent"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {results.length === 0 ? (
          <p className="text-sm text-text-secondary">No patterns match your search.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-default text-left text-text-secondary">
                <th className="px-2 py-1.5 font-medium">Pattern</th>
                <th className="px-2 py-1.5 font-medium">Description</th>
                <th className="px-2 py-1.5 font-medium">Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {results.map((entry) => (
                <tr key={`${entry.category}-${entry.pattern}`}>
                  <td className="px-2 py-1.5 align-top">
                    <code className="rounded-sm bg-bg-raised px-1.5 py-0.5 font-mono text-text-primary">
                      {entry.pattern}
                    </code>
                  </td>
                  <td className="px-2 py-1.5 align-top text-text-primary">{entry.description}</td>
                  <td className="px-2 py-1.5 align-top">
                    {entry.example ? (
                      <code className="font-mono text-text-secondary">{entry.example}</code>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
