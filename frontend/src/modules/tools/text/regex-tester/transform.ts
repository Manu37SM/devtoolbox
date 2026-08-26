import type { RegexFlags } from "./schema";

export interface RegexMatch {
  match: string;
  index: number;
  groups: Array<string | undefined>;
  namedGroups: Record<string, string | undefined> | null;
}

export interface RegexTestResult {
  matches: RegexMatch[];
  error: string | null;
}

function flagsToString(flags: RegexFlags): string {
  return (
    (flags.global ? "g" : "") +
    (flags.ignoreCase ? "i" : "") +
    (flags.multiline ? "m" : "") +
    (flags.dotAll ? "s" : "") +
    (flags.unicode ? "u" : "")
  );
}

export function testRegex(pattern: string, flags: RegexFlags, input: string): RegexTestResult {
  if (pattern.length === 0) return { matches: [], error: null };

  let regex: RegExp;
  try {
    regex = new RegExp(pattern, flagsToString(flags));
  } catch (err) {
    return { matches: [], error: err instanceof Error ? err.message : "Invalid regular expression" };
  }

  if (input.length === 0) return { matches: [], error: null };

  const matches: RegexMatch[] = [];

  if (!flags.global) {
    const m = regex.exec(input);
    if (m) matches.push(toRegexMatch(m));
    return { matches, error: null };
  }

  let m: RegExpExecArray | null;
  let iterations = 0;
  const maxIterations = 100_000;
  while ((m = regex.exec(input)) !== null && iterations < maxIterations) {
    iterations++;
    matches.push(toRegexMatch(m));
    if (m[0].length === 0) regex.lastIndex++;
  }

  return { matches, error: null };
}

function toRegexMatch(m: RegExpExecArray): RegexMatch {
  return {
    match: m[0],
    index: m.index,
    groups: Array.from(m).slice(1),
    namedGroups: m.groups ? { ...m.groups } : null,
  };
}

export function replaceRegex(pattern: string, flags: RegexFlags, input: string, replacement: string): { output: string; error: string | null } {
  if (pattern.length === 0) return { output: input, error: null };

  try {
    const regex = new RegExp(pattern, flagsToString(flags));
    return { output: input.replace(regex, replacement), error: null };
  } catch (err) {
    return { output: "", error: err instanceof Error ? err.message : "Invalid regular expression" };
  }
}
