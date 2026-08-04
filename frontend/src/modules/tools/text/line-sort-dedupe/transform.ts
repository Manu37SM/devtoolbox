import type { LineSortDedupeOptions } from "./schema";

export interface LineSortDedupeResult {
  output: string;
  error: { message: string } | null;
}

function sortLines(lines: string[], sort: LineSortDedupeOptions["sort"]): string[] {
  switch (sort) {
    case "none":
      return lines;
    case "alpha":
      return [...lines].sort((a, b) => a.localeCompare(b));
    case "alpha-desc":
      return [...lines].sort((a, b) => b.localeCompare(a));
    case "numeric":
      return [...lines].sort((a, b) => {
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        const aIsNum = !Number.isNaN(numA);
        const bIsNum = !Number.isNaN(numB);
        if (aIsNum && bIsNum) return numA - numB;
        if (aIsNum) return -1;
        if (bIsNum) return 1;
        return a.localeCompare(b);
      });
    case "length":
      return [...lines].sort((a, b) => a.length - b.length);
    case "shuffle": {
      // Fisher-Yates shuffle using Math.random() — not deterministic, and
      // not intended to be; tests only assert the result is a permutation.
      const result = [...lines];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j]!, result[i]!];
      }
      return result;
    }
    default:
      return lines;
  }
}

function dedupeLines(lines: string[], dedupe: LineSortDedupeOptions["dedupe"]): string[] {
  if (dedupe === "none") return lines;
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of lines) {
    const key = dedupe === "case-insensitive" ? line.toLowerCase() : line;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(line);
  }
  return result;
}

export function sortDedupeLines(input: string, options: LineSortDedupeOptions): LineSortDedupeResult {
  if (input.length === 0) return { output: "", error: null };

  try {
    let lines = input.split("\n");

    if (options.trimWhitespace) {
      lines = lines.map((line) => line.trim());
    }
    if (options.trimEmptyLines) {
      lines = lines.filter((line) => line.trim().length > 0);
    }

    lines = dedupeLines(lines, options.dedupe);
    lines = sortLines(lines, options.sort);

    return { output: lines.join("\n"), error: null };
  } catch (err) {
    return { output: "", error: { message: err instanceof Error ? err.message : "Transform failed" } };
  }
}
