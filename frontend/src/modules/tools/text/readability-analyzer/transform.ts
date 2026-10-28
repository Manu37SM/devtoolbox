import type { TransformResult } from "@/lib/tool-transform";
import type { ReadabilityAnalyzerOptions } from "./schema";

/** Heuristic English syllable counter (good to ±1 on most words). */
export function countSyllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|[^tdaeiouy]ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = w.match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e)\./gi, "$1")
    .split(/(?<=[.!?])["')\]]*\s+|\n{2,}/)
    .map((s) => s.trim())
    .filter((s) => /[A-Za-z0-9]/.test(s));
}

export function tokenizeWords(text: string): string[] {
  return text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? [];
}

export function gradeLabel(fre: number): string {
  if (fre >= 90) return "Very easy (5th grade)";
  if (fre >= 80) return "Easy (6th grade)";
  if (fre >= 70) return "Fairly easy (7th grade)";
  if (fre >= 60) return "Plain English (8th–9th grade)";
  if (fre >= 50) return "Fairly difficult (10th–12th grade)";
  if (fre >= 30) return "Difficult (college)";
  return "Very difficult (graduate)";
}

export function analyzeReadability(text: string) {
  const sentences = splitSentences(text);
  const words = tokenizeWords(text);
  const letters = words.reduce((a, w) => a + w.replace(/[^A-Za-z0-9]/g, "").length, 0);
  const syl = words.map(countSyllables);
  const syllables = syl.reduce((a, b) => a + b, 0);
  const poly = syl.filter((s) => s >= 3).length;
  const W = words.length, S = Math.max(1, sentences.length);
  const fre = 206.835 - 1.015 * (W / S) - 84.6 * (syllables / W);
  const fk = 0.39 * (W / S) + 11.8 * (syllables / W) - 15.59;
  const fog = 0.4 * (W / S + 100 * (poly / W));
  const smog = poly > 0 ? 1.043 * Math.sqrt(poly * (30 / S)) + 3.1291 : NaN;
  const cli = 0.0588 * ((letters / W) * 100) - 0.296 * ((S / W) * 100) - 15.8;
  const ari = 4.71 * (letters / W) + 0.5 * (W / S) - 21.43;
  return { sentences: S, words: W, letters, syllables, poly, fre, fk, fog, smog, cli, ari, avgWordsPerSentence: W / S };
}

export function runReadability(input: string, options: ReadabilityAnalyzerOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  if (!tokenizeWords(input).length) return { output: "", error: { message: "No words found" } };
  const r = analyzeReadability(input);
  const f = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : "n/a");
  const avgGrade = [r.fk, r.fog, r.cli, r.ari, ...(Number.isFinite(r.smog) ? [r.smog] : [])];
  const mean = avgGrade.reduce((a, b) => a + b, 0) / avgGrade.length;
  const lines = [
    `Words: ${r.words}   Sentences: ${r.sentences}   Syllables: ${r.syllables}   Complex words (3+ syllables): ${r.poly}`,
    `Average sentence length: ${f(r.avgWordsPerSentence)} words`,
    "",
    `Flesch Reading Ease:        ${f(r.fre)}   → ${gradeLabel(r.fre)}`,
    `Flesch–Kincaid Grade:       ${f(r.fk)}`,
    `Gunning Fog Index:          ${f(r.fog)}`,
    `SMOG Index:                 ${f(r.smog)}${Number.isFinite(r.smog) ? "" : "  (needs complex words)"}`,
    `Coleman–Liau Index:         ${f(r.cli)}`,
    `Automated Readability (ARI): ${f(r.ari)}`,
    "",
    `Average US grade level: ${f(mean)}`,
  ];
  if (r.words < 100) lines.push("", "Note: scores are unreliable below ~100 words.");
  if (options.showFormulas) lines.push("", "FRE = 206.835 − 1.015·(words/sentences) − 84.6·(syllables/words)", "FK = 0.39·(words/sentences) + 11.8·(syllables/words) − 15.59", "Fog = 0.4·(words/sentences + 100·complex/words)", "SMOG = 1.043·√(complex·30/sentences) + 3.1291", "CLI = 0.0588·L − 0.296·S − 15.8   (L letters, S sentences per 100 words)", "ARI = 4.71·(letters/words) + 0.5·(words/sentences) − 21.43");
  return { output: lines.join("\n"), error: null };
}
