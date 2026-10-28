import type { TransformResult } from "@/lib/tool-transform";
import type { StringSimilarityOptions } from "./schema";

export function levenshtein(a: string, b: string): number {
  const x = Array.from(a), y = Array.from(b);
  let prev = Array.from({ length: y.length + 1 }, (_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    const cur = [i];
    for (let j = 1; j <= y.length; j++) cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (x[i - 1] === y[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[y.length]!;
}

/** Optimal string alignment distance (Levenshtein + adjacent transposition). */
export function damerauOsa(a: string, b: string): number {
  const x = Array.from(a), y = Array.from(b);
  const d: number[][] = Array.from({ length: x.length + 1 }, (_, i) => [i, ...new Array<number>(y.length).fill(0)]);
  for (let j = 0; j <= y.length; j++) d[0]![j] = j;
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      const c = x[i - 1] === y[j - 1] ? 0 : 1;
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + c);
      if (i > 1 && j > 1 && x[i - 1] === y[j - 2] && x[i - 2] === y[j - 1]) d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
    }
  }
  return d[x.length]![y.length]!;
}

export function jaro(a: string, b: string): number {
  const x = Array.from(a), y = Array.from(b);
  if (!x.length && !y.length) return 1;
  if (!x.length || !y.length) return 0;
  const range = Math.max(0, Math.floor(Math.max(x.length, y.length) / 2) - 1);
  const mx = new Array<boolean>(x.length).fill(false), my = new Array<boolean>(y.length).fill(false);
  let m = 0;
  for (let i = 0; i < x.length; i++) {
    for (let j = Math.max(0, i - range); j <= Math.min(y.length - 1, i + range); j++) {
      if (!my[j] && x[i] === y[j]) { mx[i] = my[j] = true; m++; break; }
    }
  }
  if (!m) return 0;
  let t = 0, k = 0;
  for (let i = 0; i < x.length; i++) if (mx[i]) { while (!my[k]) k++; if (x[i] !== y[k]) t++; k++; }
  return (m / x.length + m / y.length + (m - t / 2) / m) / 3;
}

export function jaroWinkler(a: string, b: string, p = 0.1): number {
  const j = jaro(a, b);
  const x = Array.from(a), y = Array.from(b);
  let l = 0;
  while (l < 4 && l < x.length && l < y.length && x[l] === y[l]) l++;
  return j + l * p * (1 - j);
}

export function bigrams(s: string): string[] {
  const c = Array.from(s);
  return c.length < 2 ? (c.length ? [c[0]!] : []) : c.slice(0, -1).map((ch, i) => ch + c[i + 1]);
}

export function diceAndJaccard(a: string, b: string): { dice: number; jaccard: number } {
  const A = bigrams(a), B = bigrams(b);
  if (!A.length && !B.length) return { dice: 1, jaccard: 1 };
  const counts = new Map<string, number>();
  for (const g of A) counts.set(g, (counts.get(g) ?? 0) + 1);
  let inter = 0;
  for (const g of B) { const c = counts.get(g) ?? 0; if (c > 0) { inter++; counts.set(g, c - 1); } }
  const setA = new Set(A), setB = new Set(B);
  const si = [...setA].filter((g) => setB.has(g)).length;
  return { dice: (2 * inter) / (A.length + B.length), jaccard: si / (setA.size + setB.size - si) };
}

export function lcsLength(a: string, b: string): number {
  const x = Array.from(a), y = Array.from(b);
  let prev = new Array<number>(y.length + 1).fill(0);
  for (let i = 1; i <= x.length; i++) {
    const cur = [0];
    for (let j = 1; j <= y.length; j++) cur[j] = x[i - 1] === y[j - 1] ? prev[j - 1]! + 1 : Math.max(prev[j]!, cur[j - 1]!);
    prev = cur;
  }
  return prev[y.length]!;
}

export function soundex(word: string): string {
  const s = word.toUpperCase().replace(/[^A-Z]/g, "");
  if (!s) return "";
  const code = (c: string) => ("BFPV".includes(c) ? "1" : "CGJKQSXZ".includes(c) ? "2" : "DT".includes(c) ? "3" : c === "L" ? "4" : "MN".includes(c) ? "5" : c === "R" ? "6" : "");
  let out = s[0]!;
  let last = code(s[0]!);
  for (const c of s.slice(1)) {
    const d = code(c);
    if (d && d !== last) out += d;
    if (c !== "H" && c !== "W") last = d;
    if (out.length === 4) break;
  }
  return out.padEnd(4, "0");
}

export function compareStrings(a: string, b: string, o: StringSimilarityOptions): string[] {
  const x = o.ignoreCase ? a.toLowerCase() : a, y = o.ignoreCase ? b.toLowerCase() : b;
  const maxLen = Math.max(Array.from(x).length, Array.from(y).length) || 1;
  const lev = levenshtein(x, y);
  const osa = damerauOsa(x, y);
  const { dice, jaccard } = diceAndJaccard(x, y);
  const pct = (n: number) => (n * 100).toFixed(1) + "%";
  const hamming = Array.from(x).length === Array.from(y).length ? String(Array.from(x).filter((c, i) => c !== Array.from(y)[i]).length) : "n/a (different lengths)";
  return [
    `Levenshtein distance:  ${lev}   similarity ${pct(1 - lev / maxLen)}`,
    `Damerau (OSA) distance: ${osa}   similarity ${pct(1 - osa / maxLen)}`,
    `Hamming distance:      ${hamming}`,
    `Jaro:                  ${jaro(x, y).toFixed(4)}`,
    `Jaro–Winkler:          ${jaroWinkler(x, y).toFixed(4)}`,
    `Bigram Dice:           ${dice.toFixed(4)}`,
    `Bigram Jaccard:        ${jaccard.toFixed(4)}`,
    `Longest common subsequence: ${lcsLength(x, y)} characters`,
    `Soundex:               ${soundex(a) || "—"} vs ${soundex(b) || "—"}${soundex(a) && soundex(a) === soundex(b) ? "  (sound alike)" : ""}`,
  ];
}

export function compareInput(input: string, options: StringSimilarityOptions): TransformResult {
  const lines = input.split(/\r?\n/).filter((l) => l.length > 0);
  if (!lines.length) return { output: "", error: null };
  if (lines.length < 2) return { output: "", error: { message: "Enter at least two lines: the first is compared with each following line" } };
  if (lines.length > 200) return { output: "", error: { message: "At most 200 lines" } };
  const [first, ...rest] = lines as [string, ...string[]];
  return { output: rest.map((r) => [`"${first}"  vs  "${r}"`, ...compareStrings(first, r, options).map((l) => "  " + l)].join("\n")).join("\n\n"), error: null };
}
