import type { TransformResult } from "@/lib/tool-transform";
import type { CvssCalculatorOptions } from "./schema";

const AV: Record<string, number> = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 };
const AC: Record<string, number> = { L: 0.77, H: 0.44 };
const PR_U: Record<string, number> = { N: 0.85, L: 0.62, H: 0.27 };
const PR_C: Record<string, number> = { N: 0.85, L: 0.68, H: 0.5 };
const UI: Record<string, number> = { N: 0.85, R: 0.62 };
const CIA: Record<string, number> = { H: 0.56, L: 0.22, N: 0 };

const NAMES: Record<string, Record<string, string>> = {
  AV: { N: "Network", A: "Adjacent", L: "Local", P: "Physical" },
  AC: { L: "Low", H: "High" },
  PR: { N: "None", L: "Low", H: "High" },
  UI: { N: "None", R: "Required" },
  S: { U: "Unchanged", C: "Changed" },
  C: { H: "High", L: "Low", N: "None" },
  I: { H: "High", L: "Low", N: "None" },
  A: { H: "High", L: "Low", N: "None" },
};
const LABELS: Record<string, string> = { AV: "Attack Vector", AC: "Attack Complexity", PR: "Privileges Required", UI: "User Interaction", S: "Scope", C: "Confidentiality", I: "Integrity", A: "Availability" };

/** CVSS 3.1 Roundup (Appendix A) — avoids floating point drift. */
export function roundUp(x: number): number {
  const i = Math.round(x * 100000);
  return i % 10000 === 0 ? i / 100000 : (Math.floor(i / 10000) + 1) / 10;
}

export function severity(score: number): string {
  if (score === 0) return "None";
  if (score < 4) return "Low";
  if (score < 7) return "Medium";
  if (score < 9) return "High";
  return "Critical";
}

export interface CvssResult { version: string; metrics: Record<string, string>; iss: number; impact: number; exploitability: number; base: number }

export function parseVector(vector: string): { version: string; metrics: Record<string, string> } {
  const parts = vector.trim().split("/");
  const head = /^CVSS:(3\.[01])$/.exec(parts[0] ?? "");
  if (!head) {
    if (/^CVSS:4/.test(parts[0] ?? "")) throw new Error("CVSS v4.0 vectors are not supported; use a v3.0 or v3.1 vector");
    throw new Error('Vector must start with "CVSS:3.1/" or "CVSS:3.0/"');
  }
  const metrics: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    const m = /^([A-Z]+):([A-Z])$/.exec(p);
    if (!m) throw new Error(`Malformed metric "${p}"`);
    if (metrics[m[1]!]) throw new Error(`Duplicate metric ${m[1]}`);
    metrics[m[1]!] = m[2]!;
  }
  for (const k of Object.keys(NAMES)) {
    if (!metrics[k]) throw new Error(`Missing base metric ${k} (${LABELS[k]})`);
    if (!NAMES[k]![metrics[k]!]) throw new Error(`Invalid value "${metrics[k]}" for ${k} (${LABELS[k]}); expected one of ${Object.keys(NAMES[k]!).join(", ")}`);
  }
  return { version: head[1]!, metrics };
}

export function scoreVector(vector: string): CvssResult {
  const { version, metrics: m } = parseVector(vector);
  const changed = m.S === "C";
  const iss = 1 - (1 - CIA[m.C!]!) * (1 - CIA[m.I!]!) * (1 - CIA[m.A!]!);
  const impact = changed ? 7.52 * (iss - 0.029) - 3.25 * Math.pow(iss - 0.02, 15) : 6.42 * iss;
  const exploitability = 8.22 * AV[m.AV!]! * AC[m.AC!]! * (changed ? PR_C : PR_U)[m.PR!]! * UI[m.UI!]!;
  const round = version === "3.0" ? (x: number) => Math.ceil(x * 10) / 10 : roundUp;
  let base = 0;
  if (impact > 0) base = round(Math.min(changed ? 1.08 * (impact + exploitability) : impact + exploitability, 10));
  return { version, metrics: m, iss, impact, exploitability, base };
}

export function runCvss(input: string, options: CvssCalculatorOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { output: "", error: null };
  const out: string[] = [];
  let firstErr: { message: string; line?: number } | null = null;
  lines.forEach((l, i) => {
    try {
      const r = scoreVector(l);
      const rows = [`${l}`, `  Base score: ${r.base.toFixed(1)} (${severity(r.base)})  [CVSS ${r.version}]`];
      if (options.showBreakdown) {
        rows.push(`  Exploitability: ${r.exploitability.toFixed(2)}   Impact: ${r.impact.toFixed(2)}   ISS: ${r.iss.toFixed(3)}`);
        rows.push("  " + Object.keys(NAMES).map((k) => `${LABELS[k]}: ${NAMES[k]![r.metrics[k]!]}`).join(" | "));
      }
      out.push(rows.join("\n"));
    } catch (e) {
      firstErr ??= { message: `Line ${i + 1}: ${(e as Error).message}`, line: i + 1 };
      out.push(`${l}\n  ✗ ${(e as Error).message}`);
    }
  });
  return { output: out.join("\n\n"), error: firstErr };
}
