import type { TransformResult } from "@/lib/tool-transform";
import type { IpCidrMatcherOptions } from "./schema";

export interface Cidr { text: string; v6: boolean; base: bigint; prefix: number }

export function parseIp(text: string): { v6: boolean; value: bigint } {
  const s = text.trim();
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (v4) {
    const o = v4.slice(1).map(Number);
    if (o.some((n) => n > 255)) throw new Error(`Invalid IPv4 address "${s}"`);
    return { v6: false, value: BigInt(((o[0]! << 24) | (o[1]! << 16) | (o[2]! << 8) | o[3]!) >>> 0) };
  }
  if (!s.includes(":")) throw new Error(`Not an IP address: "${s}"`);
  let body = s;
  const tail = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(body);
  if (tail) {
    const o = tail.slice(1).map(Number);
    if (o.some((n) => n > 255)) throw new Error(`Invalid IPv6 address "${s}"`);
    body = body.slice(0, tail.index) + ((o[0]! << 8) | o[1]!).toString(16) + ":" + ((o[2]! << 8) | o[3]!).toString(16);
  }
  const halves = body.split("::");
  if (halves.length > 2) throw new Error(`Invalid IPv6 address "${s}"`);
  const h = halves[0] ? halves[0].split(":") : [];
  const t = halves[1] ? halves[1].split(":") : [];
  if (halves.length === 1 ? h.length !== 8 : h.length + t.length > 7) throw new Error(`Invalid IPv6 address "${s}"`);
  const groups = halves.length === 1 ? h : [...h, ...Array(8 - h.length - t.length).fill("0"), ...t];
  let value = 0n;
  for (const g of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) throw new Error(`Invalid IPv6 address "${s}"`);
    value = (value << 16n) | BigInt(parseInt(g, 16));
  }
  return { v6: true, value };
}

export function parseCidr(text: string): Cidr {
  const [addr, len, extra] = text.trim().split("/");
  if (extra !== undefined) throw new Error(`Invalid CIDR "${text}"`);
  const ip = parseIp(addr!);
  const bits = ip.v6 ? 128 : 32;
  const prefix = len === undefined ? bits : Number(len);
  if (len !== undefined && !/^\d+$/.test(len)) throw new Error(`Invalid prefix length in "${text}"`);
  if (prefix > bits) throw new Error(`Prefix /${prefix} is too long for ${ip.v6 ? "IPv6" : "IPv4"} in "${text}"`);
  const hostBits = BigInt(bits - prefix);
  const base = (ip.value >> hostBits) << hostBits;
  return { text: text.trim(), v6: ip.v6, base, prefix };
}

export function contains(c: Cidr, ip: { v6: boolean; value: bigint }): boolean {
  if (c.v6 !== ip.v6) return false;
  const bits = c.v6 ? 128 : 32;
  const hostBits = BigInt(bits - c.prefix);
  return (ip.value >> hostBits) << hostBits === c.base;
}

/** Input: CIDR list, a line containing only ---, then IP addresses. */
export function matchIps(input: string, options: IpCidrMatcherOptions): TransformResult {
  const lines = input.split(/\r?\n/);
  const sep = lines.findIndex((l) => /^\s*-{3,}\s*$/.test(l));
  if (sep < 0) return { output: "", error: input.trim() ? { message: "Put the CIDR list first, then a line with --- , then the IP addresses to test" } : null };
  const clean = (ls: string[]) => ls.map((l) => l.replace(/#.*$/, "").trim()).filter(Boolean);
  const cidrLines = clean(lines.slice(0, sep));
  const ipLines = clean(lines.slice(sep + 1));
  const cidrs: Cidr[] = [];
  for (const [i, c] of cidrLines.entries()) {
    try { cidrs.push(parseCidr(c)); } catch (e) { return { output: "", error: { message: (e as Error).message, line: i + 1 } }; }
  }
  const out: string[] = [];
  let firstErr: { message: string; line?: number } | null = null;
  ipLines.forEach((l, i) => {
    try {
      const ip = parseIp(l);
      const hits = cidrs.filter((c) => contains(c, ip)).sort((a, b) => b.prefix - a.prefix);
      if (!hits.length) out.push(`✗ ${l}  (no match)`);
      else if (options.showAll) out.push(`✓ ${l}  → ${hits.map((h) => h.text).join(", ")}`);
      else out.push(`✓ ${l}  → ${hits[0]!.text}`);
    } catch (e) {
      firstErr ??= { message: (e as Error).message, line: sep + 2 + i };
      out.push(`! ${l}  (${(e as Error).message})`);
    }
  });
  const matched = out.filter((o) => o.startsWith("✓")).length;
  if (out.length) out.push("", `${matched} of ${ipLines.length} matched against ${cidrs.length} range${cidrs.length === 1 ? "" : "s"}`);
  return { output: out.join("\n"), error: firstErr };
}
