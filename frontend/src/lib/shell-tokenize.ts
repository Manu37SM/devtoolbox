/** Shell-style tokenizer: single quotes, double quotes, $'…', backslash escapes and line continuations. */
export function tokenize(command: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inToken = false;
  let i = 0;
  const s = command.replace(/\\\r?\n/g, " ");

  while (i < s.length) {
    const ch = s[i]!;
    if (/\s/.test(ch)) {
      if (inToken) {
        tokens.push(current);
        current = "";
        inToken = false;
      }
      i++;
    } else if (ch === "'") {
      inToken = true;
      const end = s.indexOf("'", i + 1);
      if (end === -1) throw new Error("Unterminated single quote.");
      current += s.slice(i + 1, end);
      i = end + 1;
    } else if (ch === "$" && s[i + 1] === "'") {
      inToken = true;
      i += 2;
      while (i < s.length && s[i] !== "'") {
        if (s[i] === "\\" && i + 1 < s.length) {
          const next = s[i + 1]!;
          const map: Record<string, string> = { n: "\n", t: "\t", r: "\r", "'": "'", "\\": "\\", '"': '"' };
          current += map[next] ?? `\\${next}`;
          i += 2;
        } else {
          current += s[i++];
        }
      }
      if (s[i] !== "'") throw new Error("Unterminated $'…' string.");
      i++;
    } else if (ch === '"') {
      inToken = true;
      i++;
      let closed = false;
      while (i < s.length) {
        if (s[i] === "\\" && i + 1 < s.length && /["\\$`]/.test(s[i + 1]!)) {
          current += s[i + 1];
          i += 2;
        } else if (s[i] === '"') {
          closed = true;
          i++;
          break;
        } else {
          current += s[i++];
        }
      }
      if (!closed) throw new Error("Unterminated double quote.");
    } else if (ch === "\\" && i + 1 < s.length) {
      inToken = true;
      current += s[i + 1];
      i += 2;
    } else {
      inToken = true;
      current += ch;
      i++;
    }
  }
  if (inToken) tokens.push(current);
  return tokens;
}
