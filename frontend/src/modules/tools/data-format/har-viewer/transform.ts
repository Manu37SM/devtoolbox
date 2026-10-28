import type { TransformResult } from "@/lib/tool-transform";
import type { HarViewerOptions } from "./schema";

interface Row { idx: number; method: string; status: number; url: string; mime: string; size: number; time: number; started: string; statusText: string }

const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);

export function parseHar(text: string): { rows: Row[]; creator: string; pages: number } {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let har: any;
  try { har = JSON.parse(text); } catch (e) { throw new Error(`Invalid JSON: ${(e as Error).message}`); }
  const entries = har?.log?.entries;
  if (!Array.isArray(entries)) throw new Error('Not a HAR file: expected "log.entries" array');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: Row[] = entries.map((e: any, idx: number) => {
    const res = e?.response ?? {};
    const bodySize = num(res.bodySize, -1);
    const size = bodySize >= 0 ? bodySize + Math.max(num(res.headersSize, 0), 0) : Math.max(num(res.content?.size, 0), 0);
    return {
      idx: idx + 1,
      method: String(e?.request?.method ?? "?"),
      status: num(res.status),
      statusText: String(res.statusText ?? ""),
      url: String(e?.request?.url ?? ""),
      mime: String(res.content?.mimeType ?? "").split(";")[0]!.trim() || "(none)",
      size,
      time: Math.max(num(e?.time), 0),
      started: String(e?.startedDateTime ?? ""),
    };
  });
  return { rows, creator: [har.log.creator?.name, har.log.creator?.version].filter(Boolean).join(" "), pages: Array.isArray(har.log.pages) ? har.log.pages.length : 0 };
}

export const fmtBytes = (n: number) => (n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`);
export const fmtMs = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(2)} s` : `${Math.round(n)} ms`);

export function viewHar(input: string, o: HarViewerOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  let parsed: ReturnType<typeof parseHar>;
  try { parsed = parseHar(input); } catch (e) { return { output: "", error: { message: (e as Error).message } }; }
  const { rows } = parsed;
  const failed = rows.filter((r) => r.status >= 400 || r.status === 0);
  const byMime = new Map<string, { n: number; size: number }>();
  for (const r of rows) { const m = byMime.get(r.mime) ?? { n: 0, size: 0 }; m.n++; m.size += r.size; byMime.set(r.mime, m); }
  const times = rows.map((r) => r.started).filter(Boolean).map((s) => Date.parse(s)).filter((t) => !Number.isNaN(t));
  const out: string[] = [];
  out.push(`Requests: ${rows.length}   Failed (4xx/5xx/0): ${failed.length}   Transferred: ${fmtBytes(rows.reduce((a, r) => a + r.size, 0))}`);
  out.push(`Sum of request times: ${fmtMs(rows.reduce((a, r) => a + r.time, 0))}${times.length ? `   Capture span: ${new Date(Math.min(...times)).toISOString()} → ${new Date(Math.max(...times)).toISOString()}` : ""}`);
  if (parsed.creator) out.push(`Creator: ${parsed.creator}${parsed.pages ? `   Pages: ${parsed.pages}` : ""}`);
  out.push("", "By content type:");
  [...byMime.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 10).forEach(([m, v]) => out.push(`  ${m.padEnd(32)} ${String(v.n).padStart(5)} req  ${fmtBytes(v.size).padStart(10)}`));
  const list = o.onlyErrors ? failed : rows.slice();
  if (o.sortBy === "time") list.sort((a, b) => b.time - a.time);
  else if (o.sortBy === "size") list.sort((a, b) => b.size - a.size);
  else if (o.sortBy === "status") list.sort((a, b) => b.status - a.status || a.idx - b.idx);
  const shown = list.slice(0, o.maxRows);
  out.push("", `${o.onlyErrors ? "Failed requests" : "Requests"} (sorted by ${o.sortBy}${list.length > shown.length ? `, showing ${shown.length} of ${list.length}` : ""}):`);
  out.push(`${"#".padStart(4)}  ${"Method".padEnd(7)} ${"Status".padEnd(6)} ${"Time".padStart(9)} ${"Size".padStart(10)}  URL`);
  for (const r of shown) out.push(`${String(r.idx).padStart(4)}  ${r.method.padEnd(7)} ${String(r.status).padEnd(6)} ${fmtMs(r.time).padStart(9)} ${fmtBytes(r.size).padStart(10)}  ${r.url}`);
  if (!shown.length) out.push("  (none)");
  return { output: out.join("\n"), error: null };
}
