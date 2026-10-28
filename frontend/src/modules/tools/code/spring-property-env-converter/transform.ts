import { dump, load } from "js-yaml";
import type { TransformResult } from "@/lib/tool-transform";
import type { SpringPropertyEnvConverterOptions } from "./schema";

/** Spring Boot relaxed binding for environment variables: dots -> _, dashes removed, [n] -> _n_, upper-case. */
export function toEnvName(prop: string): string {
  return prop
    .replace(/\[([^\]]+)\]\.?/g, "_$1_")
    .replace(/\./g, "_")
    .replace(/-/g, "")
    .replace(/_+$/g, "")
    .toUpperCase();
}

export function fromEnvName(env: string): string {
  return env.toLowerCase().replace(/_(\d+)_?/g, "[$1].").replace(/\.$/, "").replace(/(?<!\])_/g, ".").replace(/\.\./g, ".");
}

function flatten(v: unknown, prefix: string, out: Map<string, string>): void {
  if (Array.isArray(v)) v.forEach((x, i) => flatten(x, `${prefix}[${i}]`, out));
  else if (v !== null && typeof v === "object") for (const [k, x] of Object.entries(v)) flatten(x, prefix ? `${prefix}.${k}` : k, out);
  else out.set(prefix, v === null || v === undefined ? "" : String(v));
}

export function parseProperties(text: string): Map<string, string> {
  const out = new Map<string, string>();
  const lines = text.replace(/\\\r?\n\s*/g, "").split(/\r?\n/);
  for (const [i, raw] of lines.entries()) {
    const l = raw.trim();
    if (!l || l.startsWith("#") || l.startsWith("!")) continue;
    const m = /^((?:\\.|[^=:\s\\])+)\s*[=:\s]\s*(.*)$/.exec(l);
    if (!m) throw Object.assign(new Error(`Cannot parse "${l}"`), { line: i + 1 });
    out.set(m[1]!.replace(/\\(.)/g, "$1"), m[2]!.trim());
  }
  return out;
}

export function readProps(input: string): Map<string, string> {
  const looksYaml = /^\s*[\w.-]+\s*:\s*(#.*)?$/m.test(input) || (/^\s*[\w.-]+\s*:\s+\S/m.test(input) && !/^\s*[\w.-]+\s*=/m.test(input));
  if (looksYaml) {
    const doc = load(input);
    const out = new Map<string, string>();
    if (doc === null || typeof doc !== "object") throw new Error("YAML must be a mapping");
    flatten(doc, "", out);
    return out;
  }
  return parseProperties(input);
}

const shell = (v: string) => (v === "" ? "''" : /^[\w@%+=:,./-]+$/.test(v) ? v : `'${v.replace(/'/g, `'\\''`)}'`);

export function convertSpringEnv(input: string, o: SpringPropertyEnvConverterOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  try {
    if (o.direction === "from-env") {
      const lines = input.split(/\r?\n/).map((l) => l.trim().replace(/^export\s+/, "")).filter((l) => l && !l.startsWith("#"));
      const rows = lines.map((l) => { const m = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(l); if (!m) throw new Error(`Expected NAME=value, got "${l}"`); return `${fromEnvName(m[1]!)}${o.includeValues ? "=" + m[2]!.replace(/^(['"])(.*)\1$/, "$2") : ""}`; });
      return { output: rows.join("\n") + "\n# Note: environment names lose dashes and case, so kebab-case segments (e.g. log-startup-info) cannot be recovered; Spring binds them either way.\n", error: null };
    }
    const props = readProps(input);
    if (!props.size) return { output: "", error: null };
    const env = [...props].map(([k, v]) => [toEnvName(k), v, k] as const);
    const dup = env.find((e, i) => env.findIndex((x) => x[0] === e[0]) !== i);
    switch (o.format) {
      case "dotenv": case "export":
        return { output: env.map(([n, v]) => `${o.format === "export" ? "export " : ""}${n}=${o.includeValues ? (o.format === "export" ? shell(v) : /[\s#"']/.test(v) ? JSON.stringify(v) : v) : ""}`).join("\n") + "\n" + (dup ? `# Warning: ${dup[0]} is produced by more than one property\n` : ""), error: null };
      case "docker-compose":
        return { output: dump({ environment: env.map(([n, v]) => (o.includeValues ? `${n}=${v}` : n)) }, { lineWidth: -1 }), error: null };
      case "kubernetes":
        return { output: dump({ env: env.map(([n, v]) => (o.includeValues ? { name: n, value: v } : { name: n, value: "" })) }, { lineWidth: -1, quoteStyle: "double" }), error: null };
      case "jvm":
        return { output: env.map(([, v, k]) => `-D${k}${o.includeValues ? "=" + (/\s/.test(v) ? `"${v}"` : v) : ""}`).join(" \\\n") + "\n", error: null };
    }
  } catch (e) {
    const line = (e as { line?: number }).line;
    return { output: "", error: { message: (e as Error).message, ...(line ? { line } : {}) } };
  }
}
