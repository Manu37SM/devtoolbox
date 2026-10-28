import type { TransformResult } from "@/lib/tool-transform";
import type { PackageJsonValidatorOptions } from "./schema";

type Sev = "error" | "warning" | "info";
export interface Issue { sev: Sev; path: string; msg: string }

const SEMVER = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const PART = String.raw`(?:0|[1-9]\d*|[xX*])`;
const PARTIAL = String.raw`v?${PART}(?:\.${PART}(?:\.${PART}(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?)?)?`;
const COMPARATOR = new RegExp(String.raw`^(?:[~^]|[<>]=?|=)?\s*${PARTIAL}$`);
const HYPHEN = new RegExp(String.raw`^${PARTIAL}\s+-\s+${PARTIAL}$`);

export function isValidRange(r: string): boolean {
  const s = r.trim();
  if (s === "" || s === "*" || s === "latest" || /^[a-z][\w.-]*$/i.test(s) && !/^v?\d/.test(s)) return true; // dist-tags
  return s.split("||").every((alt) => {
    const a = alt.trim();
    if (a === "") return true;
    if (HYPHEN.test(a)) return true;
    return a.split(/\s+/).reduce<string[]>((acc, tok) => { if (/^(?:[~^]|[<>]=?|=)$/.test(tok) && acc.length >= 0) { acc.push(tok); return acc; } if (acc.length && /^(?:[~^]|[<>]=?|=)$/.test(acc[acc.length - 1]!)) acc[acc.length - 1] += tok; else acc.push(tok); return acc; }, []).every((c) => COMPARATOR.test(c));
  });
}

const NON_REGISTRY = /^(?:git(?:\+\w+)?:|github:|gitlab:|bitbucket:|https?:|file:|link:|workspace:|npm:|portal:|patch:|[\w.-]+\/[\w.-]+(?:#.*)?$)/;

export function validateName(name: string): string | null {
  if (name.length === 0) return "name cannot be empty";
  if (name.length > 214) return "name must be 214 characters or fewer";
  if (name !== name.toLowerCase()) return "name must be lowercase";
  if (/\s/.test(name)) return "name cannot contain spaces";
  if (/^[._]/.test(name)) return "name cannot start with a dot or underscore";
  const m = /^(?:@([^/]+)\/)?([^/]+)$/.exec(name);
  if (!m) return "name may have at most one scope (@scope/name)";
  if (encodeURIComponent(m[2]!) !== m[2]! && !/^[a-z0-9~._-]+$/.test(m[2]!)) return "name must only contain URL-safe characters";
  if (["node_modules", "favicon.ico"].includes(m[2]!)) return `"${m[2]}" is a blocked name`;
  return null;
}

export function validatePackage(pkg: Record<string, unknown>, o: PackageJsonValidatorOptions): Issue[] {
  const out: Issue[] = [];
  const add = (sev: Sev, path: string, msg: string) => out.push({ sev, path, msg });
  const isPrivate = pkg.private === true;
  const publishing = o.forPublishing && !isPrivate;
  if (pkg.name === undefined) add(publishing ? "error" : "warning", "name", isPrivate ? "missing name" : "name is required to publish");
  else if (typeof pkg.name !== "string") add("error", "name", "name must be a string");
  else { const e = validateName(pkg.name); if (e) add("error", "name", e); }
  if (pkg.version === undefined) add(publishing ? "error" : "info", "version", "version is required to publish");
  else if (typeof pkg.version !== "string" || !SEMVER.test(pkg.version)) add("error", "version", `"${String(pkg.version)}" is not valid semver (expected MAJOR.MINOR.PATCH)`);
  if (publishing) {
    if (!pkg.description) add("warning", "description", "missing description (shown on npm search)");
    if (!pkg.license) add("warning", "license", 'missing license; use an SPDX id such as "MIT"');
    if (!pkg.repository) add("info", "repository", "missing repository field");
    if (!pkg.files && !pkg.main && !pkg.exports) add("info", "files", 'no "files", "main" or "exports": the whole package directory would be published');
    if (!pkg.keywords) add("info", "keywords", "missing keywords");
  }
  if (pkg.license !== undefined && typeof pkg.license !== "string") add("warning", "license", "license should be an SPDX expression string; object form is deprecated");
  if (pkg.main && pkg.exports) add("info", "main", '"exports" takes precedence over "main" in modern Node and bundlers');
  if (pkg.type !== undefined && pkg.type !== "module" && pkg.type !== "commonjs") add("error", "type", 'type must be "module" or "commonjs"');
  if (pkg.module && !pkg.exports) add("info", "module", '"module" is a bundler convention; add "exports" for Node ESM resolution');
  if (pkg.types && pkg.exports) add("info", "types", 'with "exports", also put a "types" condition inside each entry for TypeScript\'s modern resolution');
  const engines = pkg.engines as Record<string, string> | undefined;
  if (!engines?.node && publishing) add("info", "engines.node", "no minimum Node version declared");
  if (engines) for (const [k, v] of Object.entries(engines)) if (typeof v !== "string" || !isValidRange(v)) add("error", `engines.${k}`, `invalid version range "${String(v)}"`);
  const scripts = pkg.scripts;
  if (scripts !== undefined && (typeof scripts !== "object" || scripts === null || Array.isArray(scripts))) add("error", "scripts", "scripts must be an object");
  else if (scripts) for (const [k, v] of Object.entries(scripts as Record<string, unknown>)) {
    if (typeof v !== "string") { add("error", `scripts.${k}`, "script must be a string"); continue; }
    if (/^(?:pre|post)?install$|^prepare$/.test(k) && /curl|wget|\|\s*(?:sh|bash)|eval\s/.test(v)) add("warning", `scripts.${k}`, "lifecycle script downloads or evaluates code; consumers run it on install");
    if (/\brm\s+-rf?\s+(?:\/|\*|~)/.test(v)) add("warning", `scripts.${k}`, "destructive rm command");
    if (/\bcross-env\b/.test(v) === false && /^[A-Z_]+=\S+\s/.test(v)) add("info", `scripts.${k}`, "inline VAR=value does not work on Windows; use cross-env");
    if (k === "test" && /no test specified/.test(v)) add("info", "scripts.test", "default placeholder test script");
  }
  const sections = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const;
  const seen = new Map<string, string>();
  for (const sec of sections) {
    const deps = pkg[sec];
    if (deps === undefined) continue;
    if (typeof deps !== "object" || deps === null || Array.isArray(deps)) { add("error", sec, `${sec} must be an object`); continue; }
    for (const [name, range] of Object.entries(deps as Record<string, unknown>)) {
      const nerr = validateName(name);
      if (nerr) add("error", `${sec}.${name}`, `invalid package name: ${nerr}`);
      if (typeof range !== "string") { add("error", `${sec}.${name}`, "version must be a string"); continue; }
      if (NON_REGISTRY.test(range)) { if (/^(?:git|github:|https?:)/.test(range) && sec === "dependencies" && publishing) add("warning", `${sec}.${name}`, "non-registry dependency in a published package"); }
      else if (!isValidRange(range)) add("error", `${sec}.${name}`, `invalid version range "${range}"`);
      else if (range === "*" || range === "latest" || range === "") add("warning", `${sec}.${name}`, `"${range || "(empty)"}" accepts any version, including breaking releases`);
      const prev = seen.get(name);
      if (prev && ((prev === "dependencies" && sec === "devDependencies") || (prev === "devDependencies" && sec === "dependencies"))) add("warning", `${sec}.${name}`, `also listed in ${prev}`);
      else if (!prev || sec === "dependencies") seen.set(name, sec);
    }
  }
  if (isPrivate && pkg.publishConfig) add("info", "publishConfig", "private packages are never published; publishConfig has no effect");
  const known = new Set(["name", "version", "description", "keywords", "homepage", "bugs", "license", "author", "contributors", "funding", "files", "main", "browser", "bin", "man", "directories", "repository", "scripts", "config", "dependencies", "devDependencies", "peerDependencies", "peerDependenciesMeta", "optionalDependencies", "bundledDependencies", "bundleDependencies", "engines", "os", "cpu", "private", "publishConfig", "workspaces", "type", "module", "exports", "imports", "types", "typings", "sideEffects", "packageManager", "overrides", "resolutions", "volta", "eslintConfig", "prettier", "jest", "babel", "browserslist", "husky", "lint-staged", "nx", "pnpm", "devEngines", "unpkg", "jsdelivr", "style", "stylelint", "ava", "mocha", "nyc", "c8", "tsd", "xo", "dependenciesMeta", "libc", "deprecated", "readme", "gitHead", "_id", "$schema"]);
  for (const k of Object.keys(pkg)) if (!known.has(k) && !k.startsWith("_") && !k.startsWith("x-")) add("info", k, "unrecognized top-level field (typo? ignore if used by a tool)");
  const order = { error: 0, warning: 1, info: 2 };
  return out.sort((a, b) => order[a.sev] - order[b.sev]);
}

export function runPackageJsonValidator(input: string, o: PackageJsonValidatorOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  let pkg: unknown;
  try { pkg = JSON.parse(input); } catch (e) { return { output: "", error: { message: `Invalid JSON: ${(e as Error).message}` } }; }
  if (typeof pkg !== "object" || pkg === null || Array.isArray(pkg)) return { output: "", error: { message: "package.json must be a JSON object" } };
  const rank = { info: 0, warning: 1, error: 2 };
  const issues = validatePackage(pkg as Record<string, unknown>, o).filter((i) => rank[i.sev] >= rank[o.minSeverity]);
  const all = validatePackage(pkg as Record<string, unknown>, o);
  const e = all.filter((i) => i.sev === "error").length, w = all.filter((i) => i.sev === "warning").length, n = all.filter((i) => i.sev === "info").length;
  if (!issues.length) return { output: `✓ No issues at this severity (${e} errors, ${w} warnings, ${n} notes in total).`, error: null };
  const icon = { error: "✗", warning: "⚠", info: "ℹ" };
  return { output: [`${e} error${e === 1 ? "" : "s"}, ${w} warning${w === 1 ? "" : "s"}, ${n} note${n === 1 ? "" : "s"}`, "", ...issues.map((i) => `${icon[i.sev]} ${i.sev.toUpperCase().padEnd(7)} ${i.path}: ${i.msg}`)].join("\n"), error: null };
}
