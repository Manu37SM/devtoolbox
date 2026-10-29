import type { TransformResult } from "@/lib/tool-transform";
import type { StructuredLogConverterOptions } from "./schema";

type Rec = Record<string, unknown>;

/** Parses one logfmt line: key=value key="quoted value" flag */
export function parseLogfmt(line: string): Rec {
  const out: Rec = {};
  let i = 0;
  const n = line.length;
  while (i < n) {
    while (i < n && line[i] === " ") i++;
    let key = "";
    while (i < n && line[i] !== "=" && line[i] !== " ") key += line[i++];
    if (!key) { i++; continue; }
    if (line[i] !== "=") { out[key] = true; continue; }
    i++;
    let val = "";
    if (line[i] === '"') {
      i++;
      while (i < n && line[i] !== '"') {
        if (line[i] === "\\" && i + 1 < n) { const next = line[i + 1]!; val += next === "n" ? "\n" : next === "t" ? "\t" : next; i += 2; }
        else val += line[i++];
      }
      i++;
      out[key] = val;
    } else {
      while (i < n && line[i] !== " ") val += line[i++];
      out[key] = val;
    }
  }
  return out;
}

export function flatten(o: Rec, prefix = "", out: Rec = {}): Rec {
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) flatten(v as Rec, key, out);
    else out[key] = v;
  }
  return out;
}

export function toLogfmt(o: Rec): string {
  return Object.entries(flatten(o)).map(([k, v]) => {
    if (v === true) return k;
    const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[\s="\\]/.test(s) || s === "" ? `${k}="${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"` : `${k}=${s}`;
  }).join(" ");
}

const LEVEL_KEYS = ["level", "lvl", "severity", "log.level", "@l", "levelname", "loglevel", "level_name"];
const MSG_KEYS = ["msg", "message", "@m", "@mt", "event", "log"];
const TIME_KEYS = ["time", "ts", "timestamp", "@timestamp", "@t", "t", "date", "datetime"];
const RANK: Record<string, number> = { trace: 0, debug: 1, info: 2, warn: 3, error: 4, fatal: 5 };

export function normLevel(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number" || /^\d+$/.test(String(v))) {
    const n = Number(v);
    return n >= 60 ? "fatal" : n >= 50 ? "error" : n >= 40 ? "warn" : n >= 30 ? "info" : n >= 20 ? "debug" : "trace";
  }
  const s = String(v).toLowerCase();
  if (/^(trace|verbose|finest|finer)$/.test(s)) return "trace";
  if (/^(debug|dbg|fine|config)$/.test(s)) return "debug";
  if (/^(info|information|notice|informational)$/.test(s)) return "info";
  if (/^(warn|warning)$/.test(s)) return "warn";
  if (/^(error|err|severe)$/.test(s)) return "error";
  if (/^(fatal|critical|crit|panic|emerg|emergency|alert)$/.test(s)) return "fatal";
  return s;
}

const pick = (flat: Rec, keys: string[]): [string, unknown] | null => { for (const k of keys) if (k in flat) return [k, flat[k]]; return null; };

export function parseLine(line: string): Rec {
  const t = line.trim();
  if (t.startsWith("{")) { try { const v = JSON.parse(t); if (typeof v === "object" && v !== null) return v as Rec; } catch { /* fall through */ } }
  if (!/\w=/.test(t)) return { msg: t };
  return parseLogfmt(t);
}

function timeText(v: unknown): string {
  if (typeof v === "number") { const ms = v > 1e14 ? v / 1000 : v > 1e11 ? v : v * 1000; return new Date(ms).toISOString(); }
  return String(v);
}

export function runStructuredLogConverter(input: string, options: StructuredLogConverterOptions): TransformResult {
  const lines = input.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { output: "", error: null };
  const out: string[] = [];
  let dropped = 0;
  for (const line of lines) {
    const rec = parseLine(line);
    const flat = flatten(rec);
    const lvl = pick(flat, LEVEL_KEYS);
    const level = normLevel(lvl?.[1]);
    if (options.minLevel !== "all" && level !== null && (RANK[level] ?? 2) < RANK[options.minLevel]!) { dropped++; continue; }
    if (options.output === "json") { out.push(JSON.stringify(rec)); continue; }
    if (options.output === "logfmt") { out.push(toLogfmt(rec)); continue; }
    const time = pick(flat, TIME_KEYS);
    const msg = pick(flat, MSG_KEYS);
    const rest = Object.entries(flat).filter(([k]) => k !== lvl?.[0] && k !== time?.[0] && k !== msg?.[0]);
    const parts = [time ? timeText(time[1]) : "", (level ?? "-").toUpperCase().padEnd(5), msg ? String(msg[1]) : ""].filter((p, i) => i !== 0 || p);
    const extra = rest.length ? `  ${toLogfmt(Object.fromEntries(rest))}` : "";
    out.push(`${parts.join("  ")}${extra}`);
  }
  if (dropped && options.output === "pretty") out.push(`\n(${dropped} line${dropped === 1 ? "" : "s"} below ${options.minLevel} hidden)`);
  return { output: out.join("\n"), error: null };
}
