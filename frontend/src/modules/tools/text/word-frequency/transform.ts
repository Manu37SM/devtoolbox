import type { TransformResult } from "@/lib/tool-transform";
import type { WordFrequencyOptions } from "./schema";

const STOP_WORDS = new Set(
  "a about above after again all am an and any are as at be because been before being below between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its itself just me more most my no nor not of off on once only or other our out over own same she should so some such than that the their theirs them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your yours".split(
    " ",
  ),
);

export function wordFrequency(input: string, options: WordFrequencyOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };

  const words = input.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
  const counts = new Map<string, number>();
  let total = 0;
  for (const raw of words) {
    const word = options.caseSensitive ? raw : raw.toLowerCase();
    if (word.length < options.minLength) continue;
    if (options.ignoreStopWords && STOP_WORDS.has(word.toLowerCase())) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
    total++;
  }
  if (counts.size === 0) return { output: "No words matched the current filters.", error: null };

  const rows = Array.from(counts.entries()).sort((x, y) =>
    options.sortBy === "alpha" ? x[0].localeCompare(y[0]) : y[1] - x[1] || x[0].localeCompare(y[0]),
  );
  const shown = options.topN > 0 ? rows.slice(0, options.topN) : rows;
  const width = String(shown[0] ? Math.max(...shown.map((r) => r[1])) : 0).length;

  const lines = shown.map(([w, n]) => `${String(n).padStart(width)}  ${((n / total) * 100).toFixed(1).padStart(5)}%  ${w}`);
  return { output: `${total} words, ${counts.size} unique\n\n${lines.join("\n")}`, error: null };
}
