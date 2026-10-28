import type { TransformResult } from "@/lib/tool-transform";
import type { EnvFileCompareOptions } from "./schema";

export interface ParsedEnv { values: Map<string, string>; duplicates: string[]; invalid: string[] }

export function parseEnvFile(text: string): ParsedEnv {
  const values = new Map<string, string>();
  const duplicates: string[] = [];
  const invalid: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(.*)$/.exec(line);
    if (!m) { invalid.push(line); continue; }
    let v = m[2]!;
    const q = v[0];
    if ((q === '"' || q === "'") && v.lastIndexOf(q) > 0) v = v.slice(1, v.lastIndexOf(q));
    else v = v.replace(/\s+#.*$/, "").trim();
    if (values.has(m[1]!)) duplicates.push(m[1]!);
    values.set(m[1]!, v);
  }
  return { values, duplicates, invalid };
}

export function maskValue(v: string): string {
  if (v === "") return "(empty)";
  return v.length <= 4 ? "••••" : `${v.slice(0, 1)}••••${v.slice(-1)} (${v.length} chars)`;
}

export function compareEnvFiles(input: string, options: EnvFileCompareOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const lines = input.split(/\r?\n/);
  const sep = lines.findIndex((l) => l.trim() === "---");
  if (sep < 0) return { output: "", error: { message: "Paste file A, a line containing only ---, then file B" } };
  const a = parseEnvFile(lines.slice(0, sep).join("\n"));
  const b = parseEnvFile(lines.slice(sep + 1).join("\n"));
  const show = (v: string) => (options.showValues ? JSON.stringify(v) : maskValue(v));
  const onlyA = [...a.values.keys()].filter((k) => !b.values.has(k)).sort();
  const onlyB = [...b.values.keys()].filter((k) => !a.values.has(k)).sort();
  const both = [...a.values.keys()].filter((k) => b.values.has(k)).sort();
  const diff = both.filter((k) => a.values.get(k) !== b.values.get(k));
  const same = both.filter((k) => a.values.get(k) === b.values.get(k));
  const emptyA = [...a.values].filter(([, v]) => v === "").map(([k]) => k);
  const emptyB = [...b.values].filter(([, v]) => v === "").map(([k]) => k);
  const out: string[] = [`A: ${a.values.size} variables   B: ${b.values.size} variables   shared: ${both.length} (${diff.length} differ)`, ""];
  const section = (title: string, rows: string[]) => { if (rows.length) out.push(`${title} (${rows.length})`, ...rows.map((r) => "  " + r), ""); };
  section("Only in A", onlyA.map((k) => `${k} = ${show(a.values.get(k)!)}`));
  section("Only in B", onlyB.map((k) => `${k} = ${show(b.values.get(k)!)}`));
  section("Different values", diff.map((k) => `${k}\n      A: ${show(a.values.get(k)!)}\n      B: ${show(b.values.get(k)!)}`));
  if (options.showSame) section("Identical", same.map((k) => `${k} = ${show(a.values.get(k)!)}`));
  const warn: string[] = [];
  for (const [name, p] of [["A", a], ["B", b]] as const) {
    if (p.duplicates.length) warn.push(`${name}: duplicate keys (last one wins): ${[...new Set(p.duplicates)].join(", ")}`);
    if (p.invalid.length) warn.push(`${name}: unreadable lines: ${p.invalid.slice(0, 3).join(" | ")}`);
  }
  if (emptyA.length) warn.push(`A: empty values: ${emptyA.join(", ")}`);
  if (emptyB.length) warn.push(`B: empty values: ${emptyB.join(", ")}`);
  section("Warnings", warn);
  if (!onlyA.length && !onlyB.length && !diff.length) out.push("The two files define the same variables with the same values.");
  return { output: out.join("\n").trim(), error: null };
}
