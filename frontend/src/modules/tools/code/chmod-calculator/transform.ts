import type { TransformResult } from "@/lib/tool-transform";
import type { ChmodCalculatorOptions } from "./schema";

export interface Mode {
  u: number;
  g: number;
  o: number;
  setuid: boolean;
  setgid: boolean;
  sticky: boolean;
}

const CLASSES = ["u", "g", "o"] as const;
const LABEL = { u: "owner", g: "group", o: "other" } as const;

export function fromOctal(s: string): Mode {
  const padded = s.length === 3 ? `0${s}` : s;
  const special = Number(padded[0]);
  return {
    u: Number(padded[1]), g: Number(padded[2]), o: Number(padded[3]),
    setuid: (special & 4) !== 0, setgid: (special & 2) !== 0, sticky: (special & 1) !== 0,
  };
}

export function toOctal(m: Mode): string {
  const special = (m.setuid ? 4 : 0) + (m.setgid ? 2 : 0) + (m.sticky ? 1 : 0);
  return `${special}${m.u}${m.g}${m.o}`;
}

function triad(bits: number, special: boolean, lower: string): string {
  const r = bits & 4 ? "r" : "-";
  const w = bits & 2 ? "w" : "-";
  let x = bits & 1 ? "x" : "-";
  if (special) x = bits & 1 ? lower : lower.toUpperCase();
  return r + w + x;
}

export function toSymbolic(m: Mode): string {
  return triad(m.u, m.setuid, "s") + triad(m.g, m.setgid, "s") + triad(m.o, m.sticky, "t");
}

export function fromSymbolicString(s: string): Mode {
  const body = s.length === 10 ? s.slice(1) : s;
  const bitsOf = (t: string): [number, boolean] => {
    let bits = 0;
    let special = false;
    if (t[0] === "r") bits |= 4;
    if (t[1] === "w") bits |= 2;
    if (t[2] === "x" || t[2] === "s" || t[2] === "t") bits |= 1;
    if ("sStT".includes(t[2]!)) special = true;
    return [bits, special];
  };
  const [u, su] = bitsOf(body.slice(0, 3));
  const [g, sg] = bitsOf(body.slice(3, 6));
  const [o, st] = bitsOf(body.slice(6, 9));
  return { u, g, o, setuid: su, setgid: sg, sticky: st };
}

export function applySymbolic(expr: string, start: Mode): Mode {
  const mode: Mode = { ...start };
  for (const clause of expr.split(",")) {
    const m = /^([ugoa]*)([-+=])([rwxXst]*|[ugo])$/.exec(clause.trim());
    if (!m) throw new Error(`Can't parse "${clause}" — expected something like u+x or go-w.`);
    const who = m[1] === "" || m[1]!.includes("a") ? "ugo" : m[1]!;
    const op = m[2]!;
    const perm = m[3]!;
    let bits = 0;
    let suid = false, sgid = false, sticky = false;
    if (perm.length === 1 && "ugo".includes(perm)) {
      bits = mode[perm as "u" | "g" | "o"];
    } else {
      for (const ch of perm) {
        if (ch === "r") bits |= 4;
        else if (ch === "w") bits |= 2;
        else if (ch === "x") bits |= 1;
        else if (ch === "X" && (mode.u | mode.g | mode.o) & 1) bits |= 1;
        else if (ch === "s") { suid = who.includes("u"); sgid = who.includes("g"); }
        else if (ch === "t") sticky = true;
      }
    }
    for (const c of CLASSES) {
      if (!who.includes(c)) continue;
      if (op === "+") mode[c] |= bits;
      else if (op === "-") mode[c] &= ~bits & 7;
      else mode[c] = bits;
    }
    if (op === "=") {
      if (who.includes("u")) mode.setuid = suid;
      if (who.includes("g")) mode.setgid = sgid;
    }
    if (op === "+") {
      mode.setuid ||= suid;
      mode.setgid ||= sgid;
      mode.sticky ||= sticky;
    } else if (op === "-") {
      if (suid) mode.setuid = false;
      if (sgid) mode.setgid = false;
      if (sticky) mode.sticky = false;
    } else if (sticky) mode.sticky = true;
  }
  return mode;
}

const describeBits = (b: number) => [b & 4 ? "read" : "", b & 2 ? "write" : "", b & 1 ? "execute" : ""].filter(Boolean).join(", ") || "no access";

export function symbolicClauses(m: Mode): string {
  const part = (c: "u" | "g" | "o") => {
    const perms = (m[c] & 4 ? "r" : "") + (m[c] & 2 ? "w" : "") + (m[c] & 1 ? "x" : "");
    const extra = (c === "u" && m.setuid ? "s" : "") + (c === "g" && m.setgid ? "s" : "") + (c === "o" && m.sticky ? "t" : "");
    return `${c}=${perms}${extra}`;
  };
  return CLASSES.map(part).join(",");
}

export function parseChmod(input: string, current: string): Mode {
  const text = input.trim();
  if (/^[0-7]{3,4}$/.test(text)) return fromOctal(text);
  if (/^[-dlcbps]?[-rwxsStT]{9}$/.test(text) && (text.length === 9 || text.length === 10)) return fromSymbolicString(text);
  const base = /^[0-7]{3,4}$/.test(current.trim()) ? fromOctal(current.trim()) : fromOctal("000");
  return applySymbolic(text, base);
}

export function convertChmod(input: string, options: ChmodCalculatorOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };
  try {
    const mode = parseChmod(input, options.current);
    const octal = toOctal(mode);
    const short = octal.startsWith("0") ? octal.slice(1) : octal;
    const lines = [
      `Octal:     ${octal}`,
      `Symbolic:  ${toSymbolic(mode)}`,
      "",
      ...CLASSES.map((c) => `${LABEL[c].padEnd(6)} ${mode[c]}  ${describeBits(mode[c])}`),
    ];
    const specials = [mode.setuid && "setuid (runs as file owner)", mode.setgid && "setgid (runs as file group / inherits directory group)", mode.sticky && "sticky (only owners may delete in a directory)"].filter(Boolean);
    if (specials.length) lines.push("", `Special:   ${specials.join("; ")}`);
    lines.push("", "Commands:", `  chmod ${short} file`, `  chmod ${symbolicClauses(mode)} file`);
    return { output: lines.join("\n"), error: null };
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "Could not parse the mode." } };
  }
}
