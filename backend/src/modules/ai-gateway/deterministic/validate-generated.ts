
export interface ValidationOutcome {
  valid: boolean;
  note?: string;
}

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

export function validateGeneratedJsonSchema(candidate: string): ValidationOutcome {
  try {
    JSON.parse(candidate);
    return { valid: true, note: "Confirmed as syntactically valid JSON; schema semantics are not verified." };
  } catch {
    return { valid: false, note: "The generated output isn't valid JSON." };
  }
}
