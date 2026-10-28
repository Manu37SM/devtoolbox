import type { TransformResult } from "@/lib/tool-transform";
import type { AccessLogAnalyzerOptions } from "./schema";

export interface LogEntry { ip: string; time: string; hour: string; method: string; path: string; status: number; bytes: number; referrer: string; agent: string }

// Common / Combined Log Format (Apache, nginx default)
const CLF = /^(\S+) \S+ \S+ \[([^\]]+)\] "([^"]*)" (\d{3}) (\d+|-)(?: "([^"]*)" "([^"]*)")?/;
const MONTHS: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };

export function parseLine(line: string): LogEntry | null {
  const m = CLF.exec(line);
  if (!m) return null;
  const t = /^(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2})/.exec(m[2]!);
  const req = m[3]!.split(" ");
  const hasMethod = /^[A-Z]+$/.test(req[0] ?? "");
  return {
    ip: m[1]!, time: m[2]!,
    hour: t ? `${t[3]}-${MONTHS[t[2]!] ?? "??"}-${t[1]} ${t[4]}:00` : "unknown",
    method: hasMethod ? req[0]! : "-",
    path: hasMethod ? (req[1] ?? "-") : (m[3] || "-"),
    status: Number(m[4]), bytes: m[5] === "-" ? 0 : Number(m[5]),
    referrer: m[6] ?? "-", agent: m[7] ?? "-",
  };
}

const top = (map: Map<string, number>, n: number) => [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
const inc = (m: Map<string, number>, k: string, by = 1) => m.set(k, (m.get(k) ?? 0) + by);
const fmtBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : n < 1073741824 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1073741824).toFixed(2)} GB`);

export function analyzeLog(input: string, o: AccessLogAnalyzerOptions): TransformResult {
  const lines = input.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { output: "", error: null };
  const entries: LogEntry[] = [];
  let bad = 0, firstBad = 0;
  lines.forEach((l, i) => { const e = parseLine(l); if (e) entries.push(e); else { bad++; if (!firstBad) firstBad = i + 1; } });
  if (!entries.length) return { output: "", error: { message: "No lines matched the Common/Combined Log Format (Apache, nginx default)", line: 1 } };
  const ips = new Map<string, number>(), paths = new Map<string, number>(), agents = new Map<string, number>(), methods = new Map<string, number>(), hours = new Map<string, number>(), classes = new Map<string, number>(), errPaths = new Map<string, number>(), refs = new Map<string, number>();
  const bytesByPath = new Map<string, number>();
  let bytes = 0;
  for (const e of entries) {
    const p = o.ignoreQuery ? e.path.split("?")[0]! : e.path;
    inc(ips, e.ip); inc(paths, p); inc(methods, e.method); inc(hours, e.hour); inc(classes, `${Math.floor(e.status / 100)}xx`);
    if (e.agent !== "-") inc(agents, e.agent);
    if (e.referrer !== "-" && e.referrer !== "") inc(refs, e.referrer);
    if (e.status >= 400) inc(errPaths, `${e.status} ${p}`);
    bytes += e.bytes; inc(bytesByPath, p, e.bytes);
  }
  const section = (title: string, rows: [string, number][], fmt: (n: number) => string = String) => [`${title}:`, ...rows.map(([k, v]) => `  ${fmt(v).padStart(8)}  ${k.length > 110 ? k.slice(0, 107) + "…" : k}`), ""];
  const out = [
    `Parsed ${entries.length} request${entries.length === 1 ? "" : "s"}${bad ? ` (${bad} unparseable line${bad === 1 ? "" : "s"}, first at line ${firstBad})` : ""}`,
    `Unique IPs: ${ips.size}   Transferred: ${fmtBytes(bytes)}   Error rate (4xx/5xx): ${((100 * entries.filter((e) => e.status >= 400).length) / entries.length).toFixed(1)}%`,
    "",
    ...section("Status classes", top(classes, 10)),
    ...section("Methods", top(methods, 10)),
    ...section(`Top ${o.topN} paths`, top(paths, o.topN)),
    ...section(`Top ${o.topN} client IPs`, top(ips, o.topN)),
    ...section(`Top ${o.topN} failing requests`, top(errPaths, o.topN)),
    ...section(`Top ${o.topN} paths by bytes`, top(bytesByPath, o.topN), fmtBytes),
    ...section(`Top ${o.topN} user agents`, top(agents, o.topN)),
    ...(refs.size ? section(`Top ${o.topN} referrers`, top(refs, o.topN)) : []),
    ...section("Requests per hour", [...hours.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(0, 48)),
  ];
  return { output: out.join("\n").trimEnd(), error: null };
}
