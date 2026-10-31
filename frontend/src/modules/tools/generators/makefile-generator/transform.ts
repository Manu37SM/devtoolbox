import type { TransformResult } from "@/lib/tool-transform";
import type { MakefileGeneratorOptions } from "./schema";
import { PRESETS } from "./presets";

const TARGET = /^[A-Za-z0-9_.\/%+-]+$/;
const VARIABLE = /^([A-Za-z_][A-Za-z0-9_.]*)\s*(:=|::=|\?=|\+=|!=|=)\s*(.*)$/;

interface Rule { name: string; deps: string[]; desc: string; cmds: string[]; line: number }
interface Parsed { vars: string[]; rules: Rule[] }

/** Double `$` before shell-style names ($HOME, $1) but keep $(X), ${X}, $@ $< $^ and an existing $$. */
function escapeDollars(cmd: string): string {
  return cmd.replace(/\$\$|\$(?=[A-Za-z0-9_])/g, () => "$$");
}

function parse(text: string, label: string): Parsed | string {
  const vars: string[] = [];
  const rules: Rule[] = [];
  let cur: Rule | null = null;
  for (const [i, raw] of text.split(/\r?\n/).entries()) {
    if (!raw.trim()) continue;
    if (/^\s/.test(raw)) {
      if (!cur) return `${label} line ${i + 1}: indented command before any target.`;
      const c = raw.trim();
      if (!c.startsWith("#")) cur.cmds.push(c);
      continue;
    }
    const line = raw.trim();
    if (line.startsWith("#")) continue;
    const v = VARIABLE.exec(line);
    if (v) { vars.push(`${v[1]} ${v[2]} ${v[3]}`.trimEnd()); cur = null; continue; }
    const m = /^([^:#]+?)\s*:(?!=)\s*([^#]*?)\s*(?:#\s*(.*))?$/.exec(line);
    if (!m) return `${label} line ${i + 1}: expected "target: deps # description", "VAR = value" or an indented command — got "${line}".`;
    const name = m[1]!.trim();
    if (!TARGET.test(name)) return `${label} line ${i + 1}: target "${name}" has characters that make cannot take unquoted (spaces, $, quotes).`;
    cur = { name, deps: m[2]!.split(/\s+/).filter(Boolean), desc: (m[3] ?? "").trim(), cmds: [], line: i + 1 };
    rules.push(cur);
  }
  return { vars, rules };
}

export function makefileGenerator(input: string, options: Partial<MakefileGeneratorOptions>): TransformResult {
  const o: MakefileGeneratorOptions = {
    preset: options.preset ?? "none", shell: options.shell ?? "bash-strict", help: options.help ?? true, phony: options.phony ?? "auto", silent: options.silent ?? false,
    deleteOnError: options.deleteOnError ?? true, noBuiltinRules: options.noBuiltinRules ?? true, escapeDollar: options.escapeDollar ?? true, defaultGoal: options.defaultGoal ?? "",
  };
  const fail = (message: string): TransformResult => ({ output: "", error: { message } });
  const presetText = o.preset === "none" ? "" : (PRESETS[o.preset] ?? "");
  if (!input.trim() && !presetText) return { output: "", error: null };

  const base = presetText ? parse(presetText, "Preset") : { vars: [], rules: [] };
  const mine = parse(input, "Input");
  if (typeof base === "string") return fail(base);
  if (typeof mine === "string") return fail(mine);

  // User rules replace preset rules of the same name; user variables replace preset variables of the same name.
  const names = new Set<string>();
  for (const r of mine.rules) {
    if (names.has(r.name)) return fail(`Input line ${r.line}: target "${r.name}" is defined twice.`);
    names.add(r.name);
  }
  const rules = [...base.rules.filter((r) => !names.has(r.name)), ...mine.rules];
  const varName = (s: string) => s.split(/\s/)[0]!;
  const mineVarNames = new Set(mine.vars.map(varName));
  const vars = [...base.vars.filter((v) => !mineVarNames.has(varName(v))), ...mine.vars];
  if (rules.length === 0) return fail("Add at least one target, e.g. \"build: # Compile\" followed by an indented command.");

  for (const r of rules) {
    for (const d of r.deps) if (!/^[A-Za-z0-9_.\/%$()@<^+-]+$/.test(d)) return fail(`Target "${r.name}": dependency "${d}" is not valid.`);
  }
  const known = new Set(rules.map((r) => r.name));
  const warnings: string[] = [];
  for (const r of rules) for (const d of r.deps) if (!d.includes("$") && !d.includes("/") && !d.includes(".") && !known.has(d) && !d.includes("%")) warnings.push(`"${r.name}" depends on "${d}", which is not a target here — make will look for a file with that name.`);
  if (o.defaultGoal && !known.has(o.defaultGoal)) return fail(`Default goal "${o.defaultGoal}" is not one of the targets.`);

  const goal = o.defaultGoal || (o.help ? "help" : rules[0]!.name);
  const phony = rules.filter((r) => (o.phony === "all" ? true : o.phony === "auto" ? !/[./%]/.test(r.name) : false)).map((r) => r.name);
  if (o.help) phony.push("help");

  const L: string[] = [];
  if (warnings.length) L.push(...[...new Set(warnings)].map((w) => `# NOTE: ${w}`), "");
  if (o.shell === "bash-strict") L.push("SHELL := bash", ".SHELLFLAGS := -eu -o pipefail -c");
  else if (o.shell === "sh") L.push("SHELL := /bin/sh");
  if (o.deleteOnError) L.push(".DELETE_ON_ERROR:");
  if (o.noBuiltinRules) L.push("MAKEFLAGS += --no-builtin-rules", ".SUFFIXES:");
  L.push(`.DEFAULT_GOAL := ${goal}`);
  if (vars.length) L.push("", ...vars);
  if (phony.length) L.push("", `.PHONY: ${phony.join(" ")}`);
  if (o.help) {
    L.push("", "help: ## Show this help", "\t@awk 'BEGIN {FS = \":.*## \"} /^[a-zA-Z0-9_.\\/-]+:.*## / {printf \"  %-18s %s\\n\", $$1, $$2}' $(MAKEFILE_LIST)");
  }
  for (const r of rules) {
    L.push("", `${r.name}:${r.deps.length ? " " + r.deps.join(" ") : ""}${o.help && r.desc ? ` ## ${r.desc}` : r.desc ? ` # ${r.desc}` : ""}`);
    for (const c of r.cmds) {
      const text = o.escapeDollar ? escapeDollars(c) : c;
      L.push(`\t${o.silent && !text.startsWith("@") ? "@" : ""}${text}`);
    }
  }
  return { output: L.join("\n") + "\n", error: null };
}
