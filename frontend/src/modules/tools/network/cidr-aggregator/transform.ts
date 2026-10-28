import type { TransformResult } from "@/lib/tool-transform";
import type { CidrAggregatorOptions } from "./schema";

interface Net { v6: boolean; start: bigint; end: bigint }

export function parseIp(s: string): { v6: boolean; n: bigint } | null {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(s)) {
    const p = s.split(".").map(Number);
    if (p.some((x) => x > 255)) return null;
    return { v6: false, n: p.reduce((a, x) => (a << 8n) | BigInt(x), 0n) };
  }
  if (!/^[0-9a-fA-F:]+$/.test(s) || !s.includes(":")) return null;
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const side = (x: string) => (x === "" ? [] : x.split(":"));
  const a = side(halves[0]!), b = halves.length === 2 ? side(halves[1]!) : [];
  if (halves.length === 1 && a.length !== 8) return null;
  if (a.length + b.length > (halves.length === 2 ? 7 : 8)) return null;
  const groups = [...a, ...Array(8 - a.length - b.length).fill("0"), ...b];
  if (groups.some((g: string) => !/^[0-9a-fA-F]{1,4}$/.test(g))) return null;
  return { v6: true, n: groups.reduce((acc: bigint, g: string) => (acc << 16n) | BigInt(parseInt(g, 16)), 0n) };
}

export function formatIp(n: bigint, v6: boolean): string {
  if (!v6) return [24n, 16n, 8n, 0n].map((s) => ((n >> s) & 255n).toString()).join(".");
  const g = Array.from({ length: 8 }, (_, i) => Number((n >> BigInt((7 - i) * 16)) & 0xffffn).toString(16));
  let best = -1, bestLen = 0;
  for (let i = 0; i < 8; ) {
    if (g[i] !== "0") { i++; continue; }
    let j = i; while (j < 8 && g[j] === "0") j++;
    if (j - i > bestLen && j - i >= 2) { best = i; bestLen = j - i; }
    i = j;
  }
  if (best < 0) return g.join(":");
  return `${g.slice(0, best).join(":")}::${g.slice(best + bestLen).join(":")}`;
}

export function parseNet(tok: string): Net | string {
  const [addr, len] = tok.split("/");
  const ip = parseIp(addr!);
  if (!ip) return `Invalid address "${tok}"`;
  const bits = ip.v6 ? 128 : 32;
  const L = len === undefined ? bits : /^\d+$/.test(len) ? Number(len) : -1;
  if (L < 0 || L > bits) return `Invalid prefix length in "${tok}"`;
  const host = BigInt(bits - L), mask = ((1n << BigInt(bits)) - 1n) ^ ((1n << host) - 1n);
  const start = ip.n & mask;
  return { v6: ip.v6, start, end: start | ((1n << host) - 1n) };
}

/** Split an inclusive range into the minimal list of CIDR blocks. */
export function rangeToCidrs(start: bigint, end: bigint, v6: boolean): string[] {
  const bits = v6 ? 128n : 32n, out: string[] = [];
  while (start <= end) {
    let size = 0n;
    while (size < bits && (start & ((1n << (size + 1n)) - 1n)) === 0n && start + (1n << (size + 1n)) - 1n <= end) size++;
    out.push(`${formatIp(start, v6)}/${bits - size}`);
    start += 1n << size;
  }
  return out;
}

export function aggregate(nets: Net[]): Net[] {
  const res: Net[] = [];
  for (const v6 of [false, true]) {
    const l = nets.filter((n) => n.v6 === v6).sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
    let cur: Net | null = null;
    for (const n of l) {
      if (cur && n.start <= cur.end + 1n) { if (n.end > cur.end) cur.end = n.end; }
      else { if (cur) res.push(cur); cur = { ...n }; }
    }
    if (cur) res.push(cur);
  }
  return res;
}

export function runCidrAggregator(input: string, o: CidrAggregatorOptions): TransformResult {
  const toks = input.split(/[\s,;]+/).filter((t) => t && !t.startsWith("#"));
  if (!toks.length) return { output: "", error: null };
  const nets: Net[] = [];
  for (const t of toks) {
    const n = parseNet(t);
    if (typeof n === "string") return { output: "", error: { message: n } };
    nets.push(n);
  }
  const merged = aggregate(nets);
  const cidrs = merged.flatMap((n) => rangeToCidrs(n.start, n.end, n.v6));
  if (o.output === "range") return { output: merged.map((n) => `${formatIp(n.start, n.v6)} - ${formatIp(n.end, n.v6)}`).join("\n"), error: null };
  if (o.output === "summary") {
    const total4 = merged.filter((n) => !n.v6).reduce((a, n) => a + (n.end - n.start + 1n), 0n);
    return { output: `${toks.length} input entries -> ${cidrs.length} CIDR blocks\nIPv4 addresses covered: ${total4}\n\n${cidrs.join("\n")}`, error: null };
  }
  return { output: cidrs.join("\n"), error: null };
}
