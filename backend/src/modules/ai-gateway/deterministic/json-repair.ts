
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
