import type { TransformResult } from "@/lib/tool-transform";
import type { JvmFlagsExplainerOptions } from "./schema";
import { X_FLAGS, XX_FLAGS, type FlagInfo } from "./data";

/** Splits a command line honouring single and double quotes and backslash-newline continuations. */
export function tokenize(input: string): string[] {
  const VAR = /^\s*(?:export\s+)?(?:[A-Z_]*OPTS|[A-Z_]*JAVA_(?:TOOL_)?OPTIONS)\s*=\s*/gm;
  // VAR="..." : the shell word-splits the value when it is expanded, so unwrap the outer quotes.
  const src = input
    .replace(/\\\r?\n/g, " ")
    .replace(/^(\s*(?:export\s+)?(?:[A-Z_]*OPTS|[A-Z_]*JAVA_(?:TOOL_)?OPTIONS)\s*=\s*)(["'])([\s\S]*?)\2/gm, "$1$3")
    .replace(VAR, "");
  const out: string[] = [];
  let cur = "", quote: string | null = null, has = false;
  for (const ch of src) {
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
    } else if (ch === '"' || ch === "'") { quote = ch; has = true; }
    else if (/\s/.test(ch)) { if (has || cur) out.push(cur); cur = ""; has = false; }
    else { cur += ch; }
  }
  if (cur || has) out.push(cur);
  return out;
}

const SIZE = /^(\d+)([kKmMgGtT]?)$/;
export function parseSize(v: string): number | null {
  const m = SIZE.exec(v);
  if (!m) return null;
  const mult = { "": 1, k: 1024, m: 1024 ** 2, g: 1024 ** 3, t: 1024 ** 4 }[m[2]!.toLowerCase() as "" | "k" | "m" | "g" | "t"];
  return Number(m[1]) * mult;
}
const human = (b: number) => (b >= 1024 ** 3 ? `${+(b / 1024 ** 3).toFixed(2)} GiB` : b >= 1024 ** 2 ? `${+(b / 1024 ** 2).toFixed(1)} MiB` : `${+(b / 1024).toFixed(0)} KiB`);

function status(info: FlagInfo, v: number): string | null {
  if (info.removed !== undefined && v >= info.removed) return `REMOVED in JDK ${info.removed}: the JVM ${info.removed <= 8 ? "ignores it or" : ""} refuses to start with an unrecognized option${info.replacement ? `. Use ${info.replacement}` : ""}`.replace("  ", " ");
  if (info.deprecated !== undefined && v >= info.deprecated) return `Deprecated since JDK ${info.deprecated}${info.removed ? `, removed in ${info.removed}` : ""}${info.replacement ? `. Use ${info.replacement}` : ""}`;
  if (info.since !== undefined && v < info.since) return `Not available before JDK ${info.since}`;
  return null;
}

export function runJvmFlagsExplainer(input: string, options: JvmFlagsExplainerOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const v = Number(options.javaVersion);
  const tokens = tokenize(input);
  const lines: string[] = [];
  const warnings: string[] = [];
  const props: string[] = [];
  const gcs: string[] = [];
  const sizes: Record<string, number> = {};
  const seen = new Map<string, string>();
  let unknown = 0;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    if (/^(java|java\.exe|.*\/java)$/.test(t)) continue;
    if (t === "-jar") { lines.push(`-jar ${tokens[i + 1] ?? ""}\n    Run the executable JAR; everything after it is passed to the application.`); break; }
    if (t === "-cp" || t === "-classpath" || t === "--class-path" || t === "-p" || t === "--module-path") { lines.push(`${t} ${tokens[++i] ?? ""}\n    ${t === "-p" || t === "--module-path" ? "Module path" : "Class path"}.`); continue; }
    if (t.startsWith("-D")) { props.push(t.slice(2)); continue; }
    if (t.startsWith("--add-opens") || t.startsWith("--add-exports") || t.startsWith("--add-modules") || t.startsWith("--enable-native-access")) {
      const val = t.includes("=") ? t.split("=").slice(1).join("=") : tokens[++i] ?? "";
      lines.push(`${t.split("=")[0]} ${val}\n    Module system access override (JDK 9+); often needed by reflection-heavy libraries on JDK 17+.`);
      continue;
    }
    if (t === "--enable-preview") { lines.push("--enable-preview\n    Allow preview language and API features; classes compiled with it only run on the same JDK feature version."); continue; }
    if (t.startsWith("-javaagent:")) { lines.push(`${t}\n    Load a Java agent (APM, instrumentation) before main().`); continue; }
    if (t.startsWith("-agentlib:jdwp")) { lines.push(`${t}\n    Remote debugger. Do not leave it enabled in production; address=*:port listens on all interfaces.`); if (/address=\*?:?\d+/.test(t) && !/127\.0\.0\.1|localhost/.test(t)) warnings.push("JDWP debug port is exposed on all interfaces: anyone who can reach it can run code in the JVM."); continue; }
    if (t === "-server" || t === "-client") { lines.push(`${t}\n    Legacy VM selection; 64-bit JVMs always use the server VM.`); continue; }
    if (t === "-verbose:gc") { lines.push(`${t}\n    Basic GC logging${v >= 9 ? " (alias of -Xlog:gc)" : ""}.`); continue; }
    if (t === "-ea" || t === "-enableassertions") { lines.push(`${t}\n    Enable assert statements.`); continue; }
    if (t === "-noverify") { lines.push(`${t}\n    Skip bytecode verification.${v >= 13 ? " Deprecated since JDK 13." : ""}`); continue; }

    const xx = /^-XX:([+-]?)([A-Za-z0-9_]+)(?:=(.*))?$/.exec(t);
    if (xx) {
      const [, sign, name, value] = xx as unknown as [string, string, string, string | undefined];
      const info = XX_FLAGS[name];
      const on = sign !== "-";
      const shown = sign ? `${sign === "+" ? "enabled" : "disabled"}` : `= ${value}`;
      if (seen.has(name) && seen.get(name) !== t) warnings.push(`-XX:${name} is set more than once; the last occurrence (${t}) wins.`);
      seen.set(name, t);
      if (!info) { unknown++; lines.push(`${t}\n    (${shown}) Not in this reference; check with java -XX:+PrintFlagsFinal -version.`); continue; }
      const st = status(info, v);
      lines.push(`${t}\n    ${info.desc}${sign === "-" ? " [disabled]" : ""}${st ? `\n    ! ${st}` : ""}`);
      if (st?.startsWith("REMOVED")) warnings.push(`-XX:${name} was removed in JDK ${info.removed}; on JDK ${v} the JVM will fail with "Unrecognized VM option".`);
      if (info.experimental && !tokens.includes("-XX:+UnlockExperimentalVMOptions") && on && v >= (info.since ?? 0)) warnings.push(`-XX:${name} is experimental and needs -XX:+UnlockExperimentalVMOptions before it.`);
      if (on && /^Use(G1|Parallel|Serial|Z|Shenandoah|Epsilon|ConcMarkSweep)GC$/.test(name)) gcs.push(name);
      if (value && /^(MaxMetaspaceSize|MaxDirectMemorySize|ReservedCodeCacheSize)$/.test(name)) { const b = parseSize(value); if (b !== null) sizes[name] = b; }
      if (name === "MaxRAMPercentage" && value && Number(value) > 90) warnings.push(`MaxRAMPercentage=${value} leaves little room for Metaspace, thread stacks, code cache and direct buffers; containers often get OOM-killed above ~75-80%.`);
      continue;
    }

    const x = /^-(Xmx|Xms|Xmn|Xss)(.+)$/.exec(t);
    if (x) {
      const b = parseSize(x[2]!);
      sizes[x[1]!] = b ?? NaN;
      lines.push(`${t}\n    ${X_FLAGS[x[1]!]!.desc}${b !== null ? ` (${human(b)})` : " (unparseable size)"}`);
      continue;
    }
    const xo = /^-(X[a-z]+)(?::(.*))?$/.exec(t);
    if (xo && X_FLAGS[xo[1]!]) {
      const info = X_FLAGS[xo[1]!]!;
      const st = status(info, v);
      lines.push(`${t}\n    ${info.desc}${st ? `\n    ! ${st}` : ""}${xo[1] === "Xverify" && xo[2] === "none" && v >= 13 ? "\n    ! -Xverify:none is deprecated since JDK 13" : ""}`);
      continue;
    }
    if (t.startsWith("-")) { unknown++; lines.push(`${t}\n    Not in this reference.`); continue; }
    lines.push(`${t}\n    Main class or application argument.`);
  }

  if (gcs.length > 1) warnings.push(`More than one garbage collector selected (${gcs.join(", ")}): the JVM refuses to start with conflicting collectors.`);
  if (sizes.Xms !== undefined && sizes.Xmx !== undefined && sizes.Xms > sizes.Xmx) warnings.push("-Xms is larger than -Xmx: the JVM fails with \"Initial heap size set to a larger value than the maximum heap size\".");
  if (sizes.Xmx !== undefined && tokens.some((t) => /^-XX:(Max|Initial|Min)RAMPercentage=/.test(t))) warnings.push("-Xmx is set, so -XX:MaxRAMPercentage/InitialRAMPercentage are ignored for the maximum heap.");
  if (sizes.Xmn !== undefined && sizes.Xmx !== undefined && sizes.Xmn >= sizes.Xmx) warnings.push("-Xmn is not smaller than -Xmx.");
  if (tokens.includes("-XX:+HeapDumpOnOutOfMemoryError") && !tokens.some((t) => t.startsWith("-XX:HeapDumpPath"))) warnings.push("HeapDumpOnOutOfMemoryError without HeapDumpPath writes the dump to the working directory, which may be read-only or ephemeral in a container.");

  const out: string[] = [];
  if (warnings.length) out.push(`Warnings (JDK ${v}):\n${warnings.map((w) => `  ! ${w}`).join("\n")}\n`);
  if (sizes.Xmx !== undefined && !Number.isNaN(sizes.Xmx)) {
    const stack = sizes.Xss ?? 1024 * 1024;
    const meta = sizes.MaxMetaspaceSize;
    const parts = [`heap ${human(sizes.Xmx)}`, meta ? `Metaspace ≤ ${human(meta)}` : "Metaspace unbounded", `${human(sizes.ReservedCodeCacheSize ?? 240 * 1024 ** 2)} code cache`, `${human(stack)} per thread stack`, `direct buffers ≤ ${human(sizes.MaxDirectMemorySize ?? sizes.Xmx)}`];
    out.push(`Memory beyond the heap: ${parts.join(", ")}. Leave headroom above -Xmx when sizing a container limit.\n`);
  }
  out.push(lines.join("\n"));
  if (options.showSystemProperties && props.length) out.push(`\nSystem properties (-D):\n${props.map((p) => {
    const [k, ...rest] = p.split("=");
    const val = rest.join("=");
    const secret = /pass(word)?|secret|token|api[._-]?key|credential/i.test(k!);
    return `  ${k} = ${secret && val ? "******** (looks like a secret: it is visible in ps and /proc)" : val}`;
  }).join("\n")}`);
  if (unknown) out.push(`\n${unknown} option${unknown > 1 ? "s" : ""} not in this reference.`);
  return { output: out.join("\n").trim(), error: null };
}
