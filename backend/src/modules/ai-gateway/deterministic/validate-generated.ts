/**
 * Deterministic validation for `/ai/generate` results — API.md §9's
 * "generated artifact + deterministic validation result" and FEATURE.md's
 * per-tool notes ("validated deterministically after generation" for
 * NL→Cron, "always validated against user-provided test strings" for
 * NL→Regex). The model's output is never trusted on its own; these run
 * *after* the AI call and the result (`validated: boolean`) is surfaced to
 * the user so a wrong-looking generation is visibly flagged rather than
 * silently presented as confirmed-correct.
 */
export interface ValidationOutcome {
  valid: boolean;
  note?: string;
}

/**
 * Light-touch structural check, not full cron semantics (no leap-year/day-
 * of-month-31-in-February edge-case validation, no support for `@daily`-
 * style nicknames) — five whitespace-separated fields, each restricted to
 * cron's basic character set. Good enough to catch the AI hallucinating a
 * malformed field (extra field, prose leaking in, etc.), which is the
 * actual failure mode this guards against.
 */
export function validateCronExpression(expression: string): ValidationOutcome {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) {
    return { valid: false, note: `Expected 5 fields (minute hour day month weekday), got ${fields.length}.` };
  }
  const fieldPattern = /^(\*|[0-9*,\-/]+)$/;
  const invalidIndex = fields.findIndex((f) => !fieldPattern.test(f));
  if (invalidIndex !== -1) {
    return { valid: false, note: `Field ${invalidIndex + 1} ("${fields[invalidIndex]}") isn't valid cron syntax.` };
  }
  return { valid: true };
}

/**
 * Compiles the pattern (catching JS regex syntax errors) and, if the user
 * supplied example strings, checks the pattern actually matches every one
 * of them — per FEATURE.md, a generated regex is only ever shown as
 * "confirmed" once it demonstrably matches the caller's own examples, not
 * just because it compiled.
 */
export function validateGeneratedRegex(pattern: string, examples: string[] | undefined): ValidationOutcome {
  let re: RegExp;
  try {
    re = new RegExp(pattern);
  } catch (err) {
    return { valid: false, note: `Not a valid regular expression: ${err instanceof Error ? err.message : "parse error"}.` };
  }

  if (!examples || examples.length === 0) {
    return { valid: true, note: "Compiled successfully; no test strings were provided to verify matches against." };
  }

  const nonMatching = examples.filter((e) => !re.test(e));
  if (nonMatching.length > 0) {
    return { valid: false, note: `Doesn't match ${nonMatching.length} of ${examples.length} provided example(s).` };
  }
  return { valid: true };
}

/** json-schema generation only gets a shallow "is this even valid JSON"
 * check — deterministically verifying it's a *correct* schema for the
 * user's intent would require a JSON Schema meta-validator and still
 * couldn't judge semantic correctness, so this deliberately doesn't
 * overclaim "validated" the way cron/regex can. */
export function validateGeneratedJsonSchema(candidate: string): ValidationOutcome {
  try {
    JSON.parse(candidate);
    return { valid: true, note: "Confirmed as syntactically valid JSON; schema semantics are not verified." };
  } catch {
    return { valid: false, note: "The generated output isn't valid JSON." };
  }
}
