import type { TransformResult } from "@/lib/tool-transform";
import type { JavaStacktraceAnalyzerOptions } from "./schema";

export interface Frame { cls: string; method: string; loc: string; raw: string }
export interface Cause { type: string; message: string; frames: Frame[]; omitted: number; suppressed: boolean }

const HEAD = /^(?:(Caused by|Suppressed):\s*)?((?:[a-zA-Z_$][\w$]*\.)*[A-Za-z_$][\w$]*(?:Exception|Error|Throwable))(?::\s?(.*))?$/;
const FRAME = /^\s*at\s+([\w$.<>/]+)\.([\w$<>]+)\(([^)]*)\)/;
const MORE = /^\s*\.\.\.\s+(\d+)\s+(?:more|common frames omitted)/;

export function parseTrace(text: string): Cause[] {
  const causes: Cause[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    const frame = FRAME.exec(line);
    if (frame && causes.length) { causes[causes.length - 1]!.frames.push({ cls: frame[1]!, method: frame[2]!, loc: frame[3]!, raw: trimmed }); continue; }
    const more = MORE.exec(line);
    if (more && causes.length) { causes[causes.length - 1]!.omitted += Number(more[1]); continue; }
    const head = HEAD.exec(trimmed.replace(/^\d{4}-\d{2}-\d{2}[^\s]*\s+[\d:.,]+\s+\w+\s+.*?-\s+/, ""));
    if (head && !/^\s+at\s/.test(line)) causes.push({ type: head[2]!, message: head[3] ?? "", frames: [], omitted: 0, suppressed: head[1] === "Suppressed" });
  }
  return causes;
}

const short = (t: string) => t.slice(t.lastIndexOf(".") + 1);

export function analyzeStacktrace(input: string, options: JavaStacktraceAnalyzerOptions): TransformResult {
  if (input.trim() === "") return { output: "", error: null };
  const causes = parseTrace(input);
  if (causes.length === 0) return { output: "", error: { message: 'No exception found. Paste a trace that starts like "java.lang.NullPointerException: …".' } };
  const chain = causes.filter((c) => !c.suppressed);
  const root = chain[chain.length - 1]!;
  const prefixes = options.appPackages.split(/[,\s]+/).filter(Boolean);
  const isApp = (f: Frame) => prefixes.some((p) => f.cls.startsWith(p));
  const out: string[] = [];
  out.push(`Root cause   ${root.type}${root.message ? `: ${root.message}` : ""}`);
  const top = root.frames[0];
  if (top) out.push(`Thrown at    ${top.cls}.${top.method}(${top.loc})`);
  if (prefixes.length) {
    const first = root.frames.find(isApp) ?? chain.flatMap((c) => c.frames).find(isApp);
    out.push(first ? `Your code    ${first.cls}.${first.method}(${first.loc})` : `Your code    no frames in ${prefixes.join(", ")}`);
  }
  out.push("", `Exception chain (${chain.length}):`);
  chain.forEach((c, i) => out.push(`  ${"  ".repeat(Math.min(i, 4))}${i ? "↳ " : ""}${short(c.type)}${c.message ? `: ${c.message.length > 100 ? `${c.message.slice(0, 100)}…` : c.message}` : ""}`));
  if (causes.some((c) => c.suppressed)) out.push(`  (+ ${causes.filter((c) => c.suppressed).length} suppressed)`);

  const hint = HINTS.find(([re]) => re.test(root.type));
  if (hint) out.push("", `Usual suspects: ${hint[1]}`);

  if (options.showFrames) {
    out.push("", `Frames of root cause${prefixes.length ? " (framework frames collapsed)" : ""}:`);
    let hidden = 0;
    const flush = () => { if (hidden) { out.push(`      … ${hidden} framework frame${hidden === 1 ? "" : "s"}`); hidden = 0; } };
    for (const f of root.frames) {
      if (prefixes.length && !isApp(f)) { hidden++; continue; }
      flush();
      out.push(`  ${prefixes.length ? "→" : " "} ${f.raw}`);
    }
    flush();
    if (root.omitted) out.push(`      … ${root.omitted} more shared with the enclosing exception`);
  }
  return { output: out.join("\n"), error: null };
}

const HINTS: [RegExp, string][] = [
  [/NullPointerException$/, "a null field/return value; check Optional use, uninitialised @Autowired fields, or an unmocked dependency in tests."],
  [/ClassNotFoundException$|NoClassDefFoundError$/, "missing or conflicting dependency, wrong scope (provided/test), or a shaded jar missing classes."],
  [/NoSuchMethodError$|AbstractMethodError$/, "two versions of the same library on the classpath (run mvn dependency:tree)."],
  [/OutOfMemoryError$/, "heap/metaspace exhaustion; take a heap dump (-XX:+HeapDumpOnOutOfMemoryError) before changing -Xmx."],
  [/StackOverflowError$/, "unbounded recursion, often a bidirectional JPA/Jackson relationship or a toString/equals cycle."],
  [/LazyInitializationException$/, "a lazy Hibernate association read after the session closed; fetch it in the transaction or use a DTO projection."],
  [/BeanCreationException$|UnsatisfiedDependencyException$|NoSuchBeanDefinitionException$/, "a missing @Component/@Bean, a profile mismatch, or a circular dependency; read the innermost cause."],
  [/SQLException$|SQLSyntaxErrorException$|DataAccessException$/, "check the ORA-/SQLState code in the message (e.g. ORA-00942 table missing, ORA-00001 unique violation, ORA-01795 IN list > 1000)."],
  [/SocketTimeoutException$|ConnectException$/, "network path, firewall, or an unresponsive downstream — check timeouts and the target host/port."],
  [/SSLHandshakeException$|CertificateException$|SunCertPathBuilderException$/, "untrusted or expired certificate; inspect the chain and the JVM truststore."],
  [/ConcurrentModificationException$/, "a collection modified during iteration, or shared mutable state across threads."],
];
