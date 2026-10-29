import type { TransformResult } from "@/lib/tool-transform";
import type { VlsmSubnetPlannerOptions } from "./schema";

/** Reserved addresses per subnet and smallest allowed prefix length (largest prefix number). */
export const PLATFORM = {
  standard: { reserved: 2, maxPrefix: 30, firstOffset: 1, lastOffset: 1, note: "network and broadcast addresses reserved" },
  aws: { reserved: 5, maxPrefix: 28, firstOffset: 4, lastOffset: 1, note: "AWS reserves the first four addresses and the last one; subnets are /16 to /28" },
  azure: { reserved: 5, maxPrefix: 29, firstOffset: 4, lastOffset: 1, note: "Azure reserves the first four addresses and the last one; smallest subnet is /29" },
  gcp: { reserved: 4, maxPrefix: 29, firstOffset: 2, lastOffset: 2, note: "GCP reserves network, gateway, second-to-last and broadcast addresses; smallest subnet is /29" },
} as const;

export const ipToInt = (s: string): number | null => {
  const p = s.split(".");
  if (p.length !== 4 || p.some((x) => !/^\d{1,3}$/.test(x) || Number(x) > 255)) return null;
  return p.reduce((a, x) => a * 256 + Number(x), 0);
};
export const intToIp = (n: number) => [24, 16, 8, 0].map((s) => Math.floor(n / 2 ** s) % 256).join(".");

export interface Req { name: string; hosts: number; order: number }
export interface Alloc extends Req { start: number; prefix: number; size: number }

export function prefixFor(hosts: number, platform: VlsmSubnetPlannerOptions["platform"]): number {
  const p = PLATFORM[platform];
  const need = hosts + p.reserved;
  let prefix = 32 - Math.ceil(Math.log2(Math.max(need, 1)));
  if (2 ** (32 - prefix) < need) prefix--;
  return Math.min(prefix, p.maxPrefix);
}

export function freeBlocks(start: number, end: number): string[] {
  const out: string[] = [];
  let cur = start;
  while (cur <= end) {
    let size = 2 ** 32;
    while (size > 1 && (cur % size !== 0 || cur + size - 1 > end)) size /= 2;
    out.push(`${intToIp(cur)}/${32 - Math.log2(size)}`);
    cur += size;
  }
  return out;
}

export function plan(parent: string, reqs: Req[], o: VlsmSubnetPlannerOptions): { allocs: Alloc[]; free: string[]; base: number; parentPrefix: number } {
  const m = /^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/.exec(parent.trim());
  if (!m) throw new Error(`First line must be the parent network in CIDR form, e.g. 10.0.0.0/22 (got "${parent}").`);
  const ip = ipToInt(m[1]!);
  const parentPrefix = Number(m[2]);
  if (ip === null || parentPrefix > 32) throw new Error(`"${parent}" is not a valid IPv4 network.`);
  const parentSize = 2 ** (32 - parentPrefix);
  const base = ip - (ip % parentSize);
  const sorted = o.order === "largest-first" ? [...reqs].sort((a, b) => b.hosts - a.hosts || a.order - b.order) : reqs;
  const allocs: Alloc[] = [];
  let cur = base;
  for (const r of sorted) {
    const prefix = prefixFor(r.hosts, o.platform);
    const size = 2 ** (32 - prefix);
    if (prefix < parentPrefix) throw new Error(`${r.name} needs a /${prefix}, larger than the parent /${parentPrefix}.`);
    const start = Math.ceil(cur / size) * size;
    if (start + size > base + parentSize) throw new Error(`Not enough space: ${r.name} (${r.hosts} hosts, /${prefix}) does not fit in ${intToIp(base)}/${parentPrefix}${o.order === "input" ? ". Try largest-first ordering." : "."}`);
    allocs.push({ ...r, start, prefix, size });
    cur = start + size;
  }
  const used = [...allocs].sort((a, b) => a.start - b.start);
  const free: string[] = [];
  let pos = base;
  for (const a of used) { if (a.start > pos) free.push(...freeBlocks(pos, a.start - 1)); pos = a.start + a.size; }
  if (pos < base + parentSize) free.push(...freeBlocks(pos, base + parentSize - 1));
  return { allocs, free, base, parentPrefix };
}

export function runVlsmSubnetPlanner(input: string, options: VlsmSubnetPlannerOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (lines.length === 0) return { output: "", error: null };
  const reqs: Req[] = [];
  for (const [i, line] of lines.slice(1).entries()) {
    const m = /^(.*?)[\s,:=]+(\d+)$/.exec(line) ?? /^(\d+)$/.exec(line);
    if (!m) return { output: "", error: { message: `Line "${line}" should be "<name> <hosts>", e.g. "Sales 50".` } };
    const hosts = Number(m[2] ?? m[1]);
    if (hosts < 1) return { output: "", error: { message: `${line}: hosts must be at least 1.` } };
    reqs.push({ name: m[2] ? m[1]!.trim() : `Subnet ${i + 1}`, hosts, order: i });
  }
  if (!reqs.length) return { output: "", error: { message: "Add one subnet per line after the parent network, e.g. \"Sales 50\"." } };
  let r: ReturnType<typeof plan>;
  try { r = plan(lines[0]!, reqs, options); } catch (e) { return { output: "", error: { message: (e as Error).message } }; }
  const p = PLATFORM[options.platform];
  const rows = r.allocs.map((a) => {
    const usable = a.size - p.reserved;
    return [a.name, String(a.hosts), `${intToIp(a.start)}/${a.prefix}`, `${intToIp(a.start + p.firstOffset)} - ${intToIp(a.start + a.size - 1 - p.lastOffset)}`, String(usable), `${Math.round((a.hosts / usable) * 100)}%`];
  });
  const head = ["Subnet", "Needed", "CIDR", "Usable range", "Usable", "Fill"];
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i]!.length)));
  const fmt = (row: string[]) => row.map((c, i) => c.padEnd(w[i]!)).join("  ").trimEnd();
  const usedAddrs = r.allocs.reduce((n, a) => n + a.size, 0);
  const total = 2 ** (32 - r.parentPrefix);
  return {
    output: [
      `${intToIp(r.base)}/${r.parentPrefix}: ${usedAddrs} of ${total} addresses allocated (${Math.round((usedAddrs / total) * 100)}%); ${p.note}.`,
      "",
      fmt(head), w.map((x) => "-".repeat(x)).join("  "), ...rows.map(fmt),
      "",
      `Free: ${r.free.length ? r.free.join(", ") : "none"}`,
    ].join("\n"),
    error: null,
  };
}
