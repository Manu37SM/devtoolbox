import type { TransformResult } from "@/lib/tool-transform";
import type { AcceptHeaderNegotiatorOptions } from "./schema";

export type Kind = AcceptHeaderNegotiatorOptions["kind"];

export interface AcceptEntry {
  /** media range, language range, coding or charset, lower-cased */
  value: string;
  q: number;
  /** media-range parameters that sit before the q parameter */
  params: Array<[string, string]>;
  /** accept-ext parameters after q */
  ext: Array<[string, string]>;
  /** position in the header, for stable ordering */
  index: number;
  /** problems found while parsing (q out of range, bad syntax) */
  warnings: string[];
}

const HEADER_NAME: Record<Kind, string> = {
  accept: "Accept",
  language: "Accept-Language",
  encoding: "Accept-Encoding",
  charset: "Accept-Charset",
};

/** Splits on commas that are outside double quotes. */
function splitTop(s: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === "\\" && q) {
      cur += c + (s[i + 1] ?? "");
      i++;
      continue;
    }
    if (c === '"') q = !q;
    if (c === sep && !q) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function unquote(v: string): string {
  const t = v.trim();
  return t.length >= 2 && t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1).replace(/\\(.)/g, "$1") : t;
}

function parseWeight(raw: string, warnings: string[]): number {
  const t = raw.trim();
  if (!/^(?:0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/.test(t)) {
    const n = Number(t);
    if (Number.isFinite(n)) {
      warnings.push(`q=${t} is outside the grammar (0 to 1, at most 3 decimals); clamped`);
      return Math.min(1, Math.max(0, Math.round(n * 1000) / 1000));
    }
    warnings.push(`q=${t} is not a number; treated as 1`);
    return 1;
  }
  return Number(t);
}

export function parseAccept(header: string, kind: Kind): AcceptEntry[] {
  const entries: AcceptEntry[] = [];
  const items = splitTop(header, ",")
    .map((s) => s.trim())
    .filter((s) => s !== "");
  items.forEach((item, index) => {
    const bits = splitTop(item, ";").map((s) => s.trim());
    const value = bits[0]!.toLowerCase();
    const warnings: string[] = [];
    let q = 1;
    let seenQ = false;
    const params: Array<[string, string]> = [];
    const ext: Array<[string, string]> = [];
    for (const p of bits.slice(1)) {
      if (p === "") continue;
      const eq = p.indexOf("=");
      const name = (eq < 0 ? p : p.slice(0, eq)).trim().toLowerCase();
      const val = eq < 0 ? "" : unquote(p.slice(eq + 1));
      if (name === "q" && !seenQ) {
        seenQ = true;
        q = parseWeight(val, warnings);
      } else if (seenQ) ext.push([name, val]);
      else if (kind === "accept") params.push([name, val]);
      else warnings.push(`parameter "${name}" is not meaningful on ${HEADER_NAME[kind]}`);
    }
    if (kind === "accept" && !/^(?:\*\/\*|[!#$%&'*+.^_`|~0-9A-Za-z-]+\/(?:\*|[!#$%&'*+.^_`|~0-9A-Za-z-]+))$/.test(value)) {
      warnings.push(`"${value}" is not a valid media range`);
    }
    if (kind === "language" && !/^(?:\*|[a-z]{1,8}(?:-[a-z0-9]{1,8})*)$/i.test(value)) warnings.push(`"${value}" is not a valid language range`);
    entries.push({ value, q, params, ext, index, warnings });
  });
  return entries;
}

/** 3 = type/subtype with parameters, 2 = type/subtype, 1 = type/*, 0 = *\/* ; language: number of subtags. */
function specificity(e: AcceptEntry, kind: Kind): number {
  if (kind === "accept") {
    if (e.value === "*/*") return 0;
    if (e.value.endsWith("/*")) return 1;
    return e.params.length ? 3 : 2;
  }
  if (kind === "language") return e.value === "*" ? 0 : e.value.split("-").length;
  return e.value === "*" ? 0 : 1;
}

export function rank(entries: AcceptEntry[], kind: Kind): AcceptEntry[] {
  return [...entries].sort((a, b) => b.q - a.q || specificity(b, kind) - specificity(a, kind) || a.index - b.index);
}

export interface Verdict {
  offered: string;
  q: number;
  /** the client range that decided q, or null if nothing matched */
  by: AcceptEntry | null;
  note: string;
}

function parseOffered(offered: string, kind: Kind): { value: string; params: Array<[string, string]> } {
  const bits = splitTop(offered, ";").map((s) => s.trim());
  const params: Array<[string, string]> = [];
  if (kind === "accept") {
    for (const p of bits.slice(1)) {
      const eq = p.indexOf("=");
      if (eq > 0) params.push([p.slice(0, eq).trim().toLowerCase(), unquote(p.slice(eq + 1))]);
    }
  }
  return { value: bits[0]!.toLowerCase(), params };
}

export function judge(offered: string, entries: AcceptEntry[], kind: Kind): Verdict {
  const o = parseOffered(offered, kind);
  let best: AcceptEntry | null = null;
  let bestSpec = -1;
  for (const e of entries) {
    let ok = false;
    if (kind === "accept") {
      const [ot, os] = o.value.split("/");
      const [et, es] = e.value.split("/");
      if (e.value === "*/*") ok = true;
      else if (es === "*") ok = et === ot;
      else if (et === ot && es === os) {
        // every parameter on the range must be present on the offered type with the same value
        ok = e.params.every(([k, v]) => o.params.some(([ok2, ov]) => ok2 === k && ov.toLowerCase() === v.toLowerCase()));
      }
    } else if (kind === "language") {
      // RFC 4647 basic filtering: a range matches a tag that equals it or starts with it plus "-"
      ok = e.value === "*" || o.value === e.value || o.value.startsWith(e.value + "-");
    } else {
      ok = e.value === "*" || e.value === o.value;
    }
    if (!ok) continue;
    const s = specificity(e, kind);
    if (s > bestSpec) {
      best = e;
      bestSpec = s;
    }
  }
  if (kind === "encoding" && o.value === "identity") {
    // identity is always acceptable unless excluded by name or by "*;q=0" (RFC 9110 12.5.3)
    const named = entries.find((e) => e.value === "identity");
    const star = entries.find((e) => e.value === "*");
    if (named) return { offered, q: named.q, by: named, note: named.q === 0 ? "identity explicitly refused" : "identity requested" };
    if (star && star.q === 0) return { offered, q: 0, by: star, note: "identity refused by *;q=0" };
    return { offered, q: 1, by: null, note: "identity is acceptable unless refused" };
  }
  if (!best) {
    if (entries.length === 0) {
      // RFC 9110: no header at all means any representation is acceptable (for charset/encoding/language/accept alike)
      return { offered, q: 1, by: null, note: "no header sent: everything is acceptable" };
    }
    return { offered, q: 0, by: null, note: "no range matches" };
  }
  return { offered, q: best.q, by: best, note: best.q === 0 ? "explicitly refused (q=0)" : `matched ${best.value}` };
}

export function negotiate(header: string, offered: string[], kind: Kind): { chosen: string | null; verdicts: Verdict[] } {
  const entries = parseAccept(header, kind);
  const verdicts = offered.map((o) => judge(o, entries, kind));
  let chosen: Verdict | null = null;
  for (const v of verdicts) {
    if (v.q <= 0) continue;
    if (!chosen || v.q > chosen.q) chosen = v; // ties keep the earlier (server preferred) value
  }
  return { chosen: chosen ? chosen.offered : null, verdicts };
}

function fmtQ(q: number): string {
  return q === 1 ? "1" : String(q);
}

export function acceptHeaderNegotiator(input: string, options: Partial<AcceptHeaderNegotiatorOptions> = {}): TransformResult {
  const kind = options.kind ?? "accept";
  const mode = options.mode ?? "negotiate";
  const reasons = options.reasons ?? true;
  const hints = options.responseHints ?? true;
  let header = input.trim();
  const m = /^accept(?:-language|-encoding|-charset)?\s*:\s*/i.exec(header);
  if (m) header = header.slice(m[0].length);
  header = header.split(/\r?\n/).map((l) => l.trim()).join(", ");
  if (header === "" && mode === "parse") return { output: "", error: null };
  const entries = parseAccept(header, kind);
  const lines: string[] = [];
  if (entries.length === 0) lines.push(`(no ${HEADER_NAME[kind]} header: the client accepts anything)`);
  else {
    lines.push(`${HEADER_NAME[kind]} in order of preference:`);
    rank(entries, kind).forEach((e, i) => {
      const p = [...e.params.map(([k, v]) => `${k}=${v}`), ...e.ext.map(([k, v]) => `${k}=${v}`)].join("; ");
      lines.push(`  ${String(i + 1).padStart(2)}. ${e.value.padEnd(28)} q=${fmtQ(e.q)}${e.q === 0 ? "  (not acceptable)" : ""}${p ? `  [${p}]` : ""}`);
      for (const w of e.warnings) lines.push(`        warning: ${w}`);
    });
  }
  if (mode === "negotiate") {
    const offered = splitTop(options.offered ?? "", ",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (offered.length === 0) return { output: lines.join("\n"), error: { message: "List the values your server can produce, e.g. application/json, text/html" } };
    const { chosen, verdicts } = negotiate(header, offered, kind);
    lines.push("");
    lines.push("Offered:");
    for (const v of verdicts) {
      lines.push(`  ${v.offered.padEnd(28)} q=${fmtQ(v.q)}${reasons ? `  ${v.note}` : ""}${chosen === v.offered ? "  <= chosen" : ""}`);
    }
    lines.push("");
    lines.push(chosen ? `Best match: ${chosen}` : `No acceptable representation → respond 406 Not Acceptable`);
    if (hints) {
      lines.push("");
      lines.push(`Vary: ${HEADER_NAME[kind]}`);
      if (chosen) {
        const ct = { accept: "Content-Type", language: "Content-Language", encoding: "Content-Encoding", charset: "Content-Type; charset" }[kind];
        lines.push(kind === "encoding" && chosen === "identity" ? "(no Content-Encoding header needed for identity)" : `${ct}: ${chosen}`);
      }
    }
  }
  return { output: lines.join("\n"), error: null };
}
