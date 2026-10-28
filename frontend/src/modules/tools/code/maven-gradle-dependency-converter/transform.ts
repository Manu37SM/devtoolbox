import type { TransformResult } from "@/lib/tool-transform";
import type { MavenGradleDependencyConverterOptions } from "./schema";

export interface Dep { group: string; artifact: string; version?: string; scope?: string; type?: string; classifier?: string; optional?: boolean; bom?: boolean; exclusions: { group: string; artifact: string }[] }

const tag = (xml: string, name: string) => new RegExp(`<${name}>\\s*([^<]*?)\\s*</${name}>`).exec(xml)?.[1];

export function parseMaven(xml: string): Dep[] {
  const clean = xml.replace(/<!--[\s\S]*?-->/g, "");
  const out: Dep[] = [];
  const blocks = [...clean.matchAll(/<dependency>([\s\S]*?)<\/dependency>/g)];
  if (!blocks.length) throw new Error("No <dependency> elements found");
  for (const b of blocks) {
    const body = b[1]!;
    const noExcl = body.replace(/<exclusions>[\s\S]*?<\/exclusions>/g, "");
    const group = tag(noExcl, "groupId"), artifact = tag(noExcl, "artifactId");
    if (!group || !artifact) throw new Error("A <dependency> is missing groupId or artifactId");
    const scope = tag(noExcl, "scope");
    const type = tag(noExcl, "type");
    out.push({
      group, artifact, version: tag(noExcl, "version"), scope, type: type && type !== "jar" ? type : undefined,
      classifier: tag(noExcl, "classifier"), optional: tag(noExcl, "optional") === "true",
      bom: scope === "import" && type === "pom",
      exclusions: [...(/<exclusions>([\s\S]*?)<\/exclusions>/.exec(body)?.[1] ?? "").matchAll(/<exclusion>([\s\S]*?)<\/exclusion>/g)].map((e) => ({ group: tag(e[1]!, "groupId") ?? "*", artifact: tag(e[1]!, "artifactId") ?? "*" })),
    });
  }
  return out;
}

const CONF: Record<string, string> = { compile: "implementation", "": "implementation", runtime: "runtimeOnly", provided: "compileOnly", test: "testImplementation", system: "compileOnly" };
const gav = (d: Dep) => [d.group, d.artifact, d.version, d.classifier].filter((x, i) => x !== undefined && (i < 2 || x !== "")).join(":") + (d.type ? `@${d.type}` : "");
const q = (s: string, kotlin: boolean) => (kotlin ? `"${s}"` : `'${s}'`);

export function mavenToGradle(deps: Dep[], o: MavenGradleDependencyConverterOptions): { text: string; notes: string[] } {
  const k = o.dsl === "kotlin";
  const notes: string[] = [];
  const lines: string[] = [];
  for (const d of deps) {
    if (d.version && /\$\{/.test(d.version)) notes.push(`${d.group}:${d.artifact}: version ${d.version} is a Maven property; define it in gradle.properties or ext and use "\$name" in Gradle`);
    if (d.scope === "system") notes.push(`${d.group}:${d.artifact}: system scope has no Gradle equivalent; converted to compileOnly with the jar declared as a file dependency separately`);
    if (d.optional) notes.push(`${d.group}:${d.artifact}: <optional> has no direct Gradle equivalent (use a feature variant or compileOnly)`);
    const coord = gav(d.bom ? { ...d, type: undefined } : d).replace(/\$\{([^}]+)\}/g, "$$$1");
    if (d.bom) { lines.push(k ? `implementation(platform(${q(coord, k)}))` : `implementation platform(${q(coord, k)})`); continue; }
    const conf = CONF[d.scope ?? ""] ?? "implementation";
    const interp = /\$/.test(coord) ? (s: string) => `"${s}"` : (s: string) => q(s, k);
    const call = k ? `${conf}(${interp(coord)})` : `${conf} ${interp(coord)}`;
    if (o.includeExclusions && d.exclusions.length) {
      const ex = d.exclusions.map((e) => `    exclude(group = ${q(e.group, true)}, module = ${q(e.artifact, true)})`);
      const exG = d.exclusions.map((e) => `    exclude group: ${q(e.group, false)}, module: ${q(e.artifact, false)}`);
      lines.push(k ? `${conf}(${interp(coord)}) {\n${ex.join("\n")}\n}` : `${conf}(${interp(coord)}) {\n${exG.join("\n")}\n}`);
    } else lines.push(call);
  }
  return { text: `dependencies {\n${lines.map((l) => l.split("\n").map((x) => "    " + x).join("\n")).join("\n")}\n}`, notes };
}

const GRADLE_CONF: Record<string, string | undefined> = { implementation: undefined, api: undefined, compile: undefined, runtimeOnly: "runtime", runtime: "runtime", compileOnly: "provided", providedCompile: "provided", testImplementation: "test", testCompile: "test", testRuntimeOnly: "test", testCompileOnly: "test", annotationProcessor: "provided" };

export function parseGradle(text: string): { deps: Dep[]; notes: string[] } {
  const deps: Dep[] = [];
  const notes: string[] = [];
  const src = text.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const confs = Object.keys(GRADLE_CONF).join("|");
  const re = new RegExp(`\\b(${confs})\\b\\s*\\(?\\s*(platform\\s*\\(\\s*)?(?:(["'])([^"']+)\\3|group\\s*[:=]\\s*(["'])([^"']+)\\5\\s*,\\s*name\\s*[:=]\\s*(["'])([^"']+)\\7(?:\\s*,\\s*version\\s*[:=]\\s*(["'])([^"']*)\\9)?)`, "g");
  for (const m of src.matchAll(re)) {
    const conf = m[1]!;
    let group: string, artifact: string, version: string | undefined, classifier: string | undefined, type: string | undefined;
    if (m[4]) {
      let spec = m[4]; 
      const at = /@(\w+)$/.exec(spec); if (at) { type = at[1]; spec = spec.slice(0, -at[0].length); }
      const p = spec.split(":");
      if (p.length < 2) { notes.push(`Skipped "${m[4]}": expected group:artifact[:version]`); continue; }
      [group, artifact, version, classifier] = [p[0]!, p[1]!, p[2], p[3]];
    } else { group = m[6]!; artifact = m[8]!; version = m[10]; }
    const bom = !!m[2];
    if (version && /\$/.test(version)) notes.push(`${group}:${artifact}: version "${version}" references a Gradle variable; replace with a Maven property`);
    const exclusions: Dep["exclusions"] = [];
    const after = src.slice(m.index! + m[0].length, m.index! + m[0].length + 400);
    const blk = /^\s*\)?\s*\{([\s\S]*?)\}/.exec(after);
    if (blk) for (const e of blk[1]!.matchAll(/exclude\s*\(?\s*(?:group\s*[:=]\s*["']([^"']+)["'])?\s*,?\s*(?:module\s*[:=]\s*["']([^"']+)["'])?/g)) if (e[1] || e[2]) exclusions.push({ group: e[1] ?? "*", artifact: e[2] ?? "*" });
    if (conf === "annotationProcessor") notes.push(`${group}:${artifact}: annotationProcessor mapped to provided scope; configure it in maven-compiler-plugin <annotationProcessorPaths> instead`);
    deps.push({ group, artifact, version, scope: bom ? "import" : GRADLE_CONF[conf], type: bom ? "pom" : type, classifier, bom, exclusions });
  }
  if (!deps.length) throw new Error("No dependencies recognized (expected lines like implementation 'group:artifact:version')");
  return { deps, notes };
}

export function gradleToMaven(deps: Dep[], o: MavenGradleDependencyConverterOptions): string {
  const x = (d: Dep) => {
    const rows = [`<groupId>${d.group}</groupId>`, `<artifactId>${d.artifact}</artifactId>`];
    if (d.version) rows.push(`<version>${d.version}</version>`);
    if (d.type && d.type !== "pom") rows.push(`<type>${d.type}</type>`); else if (d.bom) rows.push("<type>pom</type>");
    if (d.classifier) rows.push(`<classifier>${d.classifier}</classifier>`);
    if (d.scope) rows.push(`<scope>${d.scope}</scope>`);
    if (o.includeExclusions && d.exclusions.length) rows.push("<exclusions>", ...d.exclusions.map((e) => `  <exclusion>\n    <groupId>${e.group}</groupId>\n    <artifactId>${e.artifact}</artifactId>\n  </exclusion>`), "</exclusions>");
    return `<dependency>\n${rows.map((r) => r.split("\n").map((l) => "  " + l).join("\n")).join("\n")}\n</dependency>`;
  };
  const boms = deps.filter((d) => d.bom), rest = deps.filter((d) => !d.bom);
  const out: string[] = [];
  if (boms.length) out.push(`<dependencyManagement>\n  <dependencies>\n${boms.map((d) => x(d).split("\n").map((l) => "    " + l).join("\n")).join("\n")}\n  </dependencies>\n</dependencyManagement>`);
  if (rest.length) out.push(`<dependencies>\n${rest.map((d) => x(d).split("\n").map((l) => "  " + l).join("\n")).join("\n")}\n</dependencies>`);
  return out.join("\n\n");
}

export function convertDependencies(input: string, o: MavenGradleDependencyConverterOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  try {
    if (o.direction === "maven-to-gradle") {
      const r = mavenToGradle(parseMaven(input), o);
      return { output: r.text + (r.notes.length ? "\n\n" + r.notes.map((n) => `// Note: ${n}`).join("\n") : ""), error: null };
    }
    const r = parseGradle(input);
    return { output: gradleToMaven(r.deps, o) + (r.notes.length ? "\n\n" + r.notes.map((n) => `<!-- Note: ${n} -->`).join("\n") : ""), error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
