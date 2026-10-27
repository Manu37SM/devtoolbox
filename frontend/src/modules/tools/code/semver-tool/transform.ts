import type { TransformResult } from "@/lib/tool-transform";
import type { SemverToolOptions } from "./schema";

export interface Semver {
  major: number;
  minor: number;
  patch: number;
  prerelease: (string | number)[];
  build: string;
}

const PATTERN =
  /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

export function parseSemver(text: string): Semver | null {
  const m = PATTERN.exec(text.trim());
  if (!m) return null;
  return {
    major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]),
    prerelease: m[4] ? m[4].split(".").map((p) => (/^\d+$/.test(p) ? Number(p) : p)) : [],
    build: m[5] ?? "",
  };
}

export function formatSemver(v: Semver): string {
  return `${v.major}.${v.minor}.${v.patch}${v.prerelease.length ? `-${v.prerelease.join(".")}` : ""}${v.build ? `+${v.build}` : ""}`;
}

export function compareSemver(a: Semver, b: Semver): number {
  for (const k of ["major", "minor", "patch"] as const) if (a[k] !== b[k]) return a[k] < b[k] ? -1 : 1;
  if (a.prerelease.length === 0 && b.prerelease.length === 0) return 0;
  if (a.prerelease.length === 0) return 1;
  if (b.prerelease.length === 0) return -1;
  const n = Math.max(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < n; i++) {
    const x = a.prerelease[i];
    const y = b.prerelease[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    if (typeof x === "number" && typeof y === "number") return x < y ? -1 : 1;
    if (typeof x === "number") return -1;
    if (typeof y === "number") return 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

export function bump(v: Semver, level: SemverToolOptions["bumpLevel"], preid: string): Semver {
  const next: Semver = { ...v, prerelease: [...v.prerelease], build: "" };
  const hasPre = v.prerelease.length > 0;
  const startPre = [preid || "rc", 0] as (string | number)[];
  switch (level) {
    case "major":
      if (v.minor !== 0 || v.patch !== 0 || !hasPre) next.major++;
      next.minor = 0; next.patch = 0; next.prerelease = [];
      break;
    case "minor":
      if (v.patch !== 0 || !hasPre) next.minor++;
      next.patch = 0; next.prerelease = [];
      break;
    case "patch":
      if (!hasPre) next.patch++;
      next.prerelease = [];
      break;
    case "premajor":
      next.major++; next.minor = 0; next.patch = 0; next.prerelease = startPre;
      break;
    case "preminor":
      next.minor++; next.patch = 0; next.prerelease = startPre;
      break;
    case "prepatch":
      next.patch++; next.prerelease = startPre;
      break;
    case "prerelease": {
      if (!hasPre) {
        next.patch++;
        next.prerelease = startPre;
      } else {
        const pre = [...v.prerelease];
        const lastNumeric = [...pre].reverse().findIndex((p) => typeof p === "number");
        if (preid && pre[0] !== preid) next.prerelease = startPre;
        else if (lastNumeric === -1) next.prerelease = [...pre, 0];
        else {
          const idx = pre.length - 1 - lastNumeric;
          pre[idx] = (pre[idx] as number) + 1;
          next.prerelease = pre;
        }
      }
      break;
    }
  }
  return next;
}

export function runSemver(input: string, options: SemverToolOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };

  const parsed = lines.map((l) => ({ raw: l, v: parseSemver(l) }));

  if (options.action === "validate") {
    return {
      output: parsed
        .map(({ raw, v }) =>
          v
            ? `✓ ${raw}  →  major ${v.major}, minor ${v.minor}, patch ${v.patch}${v.prerelease.length ? `, pre-release ${v.prerelease.join(".")}` : ""}${v.build ? `, build ${v.build}` : ""}`
            : `✗ ${raw}  →  not valid SemVer 2.0.0`,
        )
        .join("\n"),
      error: null,
    };
  }

  const bad = parsed.find((p) => !p.v);
  if (bad) return { output: "", error: { message: `"${bad.raw}" is not a valid SemVer version (e.g. 1.2.3, 2.0.0-rc.1+build5).` } };
  const versions = parsed.map((p) => p.v!);

  switch (options.action) {
    case "sort": {
      const sorted = parsed.slice().sort((a, b) => compareSemver(a.v!, b.v!) * (options.sortOrder === "desc" ? -1 : 1));
      return { output: sorted.map((p) => p.raw).join("\n"), error: null };
    }
    case "compare": {
      if (versions.length !== 2) return { output: "", error: { message: "Enter exactly two versions (one per line) to compare." } };
      const c = compareSemver(versions[0]!, versions[1]!);
      const [a, b] = lines;
      return { output: c === 0 ? `${a} = ${b}  (equal precedence)` : c < 0 ? `${a} < ${b}\n${b} is newer` : `${a} > ${b}\n${a} is newer`, error: null };
    }
    case "bump":
      return { output: versions.map((v, i) => `${lines[i]}  →  ${formatSemver(bump(v, options.bumpLevel, options.preid))}`).join("\n"), error: null };
    default:
      return { output: "", error: null };
  }
}
