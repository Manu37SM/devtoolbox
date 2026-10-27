import type { TransformResult } from "@/lib/tool-transform";
import type { PortReferenceOptions } from "./schema";
import { PORTS, type PortEntry } from "./data";

export function findPorts(query: string): PortEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return PORTS;
  if (/^\d+$/.test(q)) return PORTS.filter((p) => String(p.port) === q);
  const range = /^(\d+)\s*-\s*(\d+)$/.exec(q);
  if (range) return PORTS.filter((p) => p.port >= Number(range[1]) && p.port <= Number(range[2]));
  return PORTS.filter((p) => p.service.toLowerCase().includes(q) || (p.note ?? "").toLowerCase().includes(q));
}

export function lookupPorts(input: string, options: PortReferenceOptions): TransformResult {
  const queries = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const seen = new Set<number>();
  const hits: PortEntry[] = [];
  const missing: string[] = [];
  for (const q of queries.length ? queries : [""]) {
    const found = findPorts(q).filter((p) => (options.protocol === "any" || p.proto.includes(options.protocol)));
    if (found.length === 0) missing.push(q);
    for (const p of found) if (!seen.has(p.port)) { seen.add(p.port); hits.push(p); }
  }
  hits.sort((a, b) => a.port - b.port);
  const rows = hits.map((p) => `${String(p.port).padStart(5)}  ${p.proto.padEnd(7)}  ${p.service}${p.note ? `  — ${p.note}` : ""}`);
  if (missing.length) {
    const msg = `No match for: ${missing.join(", ")}.`;
    if (rows.length === 0) return { output: "", error: { message: `${msg} Try a port (443), a range (8000-8100) or a name (kafka).` } };
    rows.push("", msg);
  }
  return { output: rows.join("\n"), error: null };
}
