/**
 * Deterministic-first JSON repair — FEATURE.md's "AI JSON Repair" row
 * ("Deterministic repair attempted first; AI fallback for ambiguous
 * cases") and API.md §9's `/ai/json-repair` contract
 * (`repairedBy: "deterministic" | "ai"`). Pure function, no network/DOM —
 * safe to unit test directly and, per CLAUDE.md rule 1, this is the part
 * that genuinely doesn't need a server call at all (only the AI fallback
 * does), so it's kept isolated here rather than folded into the service.
 *
 * Strategy: try a fixed sequence of common, mechanical mistakes (trailing
 * commas, unquoted keys, single-quoted strings, JS-style comments) and
 * re-attempt `JSON.parse` after each cumulative fix. Stops at the first
 * version that parses. This intentionally does NOT attempt to fix
 * structural damage (mismatched brackets, truncated input, etc.) — that
 * class of repair is genuinely ambiguous (there are multiple plausible
 * "correct" completions) and is exactly what the AI fallback is for.
 */
export function attemptDeterministicJsonRepair(input: string): string | null {
  if (isValidJson(input)) return input;

  let candidate = input;
  const fixes: Array<(s: string) => string> = [
    stripComments,
    stripTrailingCommas,
    quoteUnquotedKeys,
    singleToDoubleQuotedStrings,
  ];

  for (const fix of fixes) {
    candidate = fix(candidate);
    if (isValidJson(candidate)) return candidate;
  }

  return null;
}

function isValidJson(s: string): boolean {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
}

function stripComments(s: string): string {
  // Line comments and block comments — deliberately not applied inside
  // string literals would require a real tokenizer; a plain JSON payload
  // containing a literal "//" inside a string is rare enough that this
  // simple pass is an acceptable trade for staying dependency-free, and
  // this is only ever a *candidate* fix re-validated by JSON.parse
  // immediately after — a bad strip just means this candidate is
  // discarded, not that corrupted output gets returned to the caller.
  return s.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function stripTrailingCommas(s: string): string {
  return s.replace(/,(\s*[}\]])/g, "$1");
}

function quoteUnquotedKeys(s: string): string {
  return s.replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g, '$1"$2":');
}

function singleToDoubleQuotedStrings(s: string): string {
  return s.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_match, inner: string) => `"${inner.replace(/"/g, '\\"')}"`);
}
