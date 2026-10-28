import type { TransformResult } from "@/lib/tool-transform";
import type { Ipv6AddressToolOptions } from "./schema";

/** Parse an IPv6 address (optionally with embedded IPv4 tail and %zone) into 8 hextets. */
export function parseIpv6(text: string): number[] {
  let s = text.trim().replace(/^\[|\]$/g, "");
  s = s.replace(/%.*$/, "");
  if (!s.includes(":")) throw new Error("Not an IPv6 address");
  const v4 = /(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(s);
  if (v4) {
    const o = v4.slice(1).map(Number);
    if (o.some((n) => n > 255)) throw new Error("Invalid embedded IPv4 octet");
    s = s.slice(0, v4.index) + ((o[0]! << 8) | o[1]!).toString(16) + ":" + ((o[2]! << 8) | o[3]!).toString(16);
  }
  if (s.split("::").length > 2) throw new Error('Only one "::" is allowed');
  const [head, tail] = s.split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined && tail !== "" ? tail.split(":") : [];
  const hasGap = s.includes("::");
  if (!hasGap && h.length !== 8) throw new Error(`Expected 8 groups, found ${h.length}`);
  if (hasGap && h.length + t.length > 7) throw new Error('Too many groups around "::"');
  const groups = hasGap ? [...h, ...Array(8 - h.length - t.length).fill("0"), ...t] : h;
  return groups.map((g) => {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) throw new Error(`Invalid group "${g}"`);
    return parseInt(g, 16);
  });
}

export function expand(h: number[]): string {
  return h.map((x) => x.toString(16).padStart(4, "0")).join(":");
}

/** RFC 5952 canonical form. */
export function compress(h: number[]): string {
  let bestStart = -1, bestLen = 0;
  for (let i = 0; i < 8; ) {
    if (h[i] !== 0) { i++; continue; }
    let j = i;
    while (j < 8 && h[j] === 0) j++;
    if (j - i > bestLen) { bestStart = i; bestLen = j - i; }
    i = j;
  }
  const hex = h.map((x) => x.toString(16));
  if (bestLen < 2) return hex.join(":");
  return `${hex.slice(0, bestStart).join(":")}::${hex.slice(bestStart + bestLen).join(":")}`;
}

export function reversePointer(h: number[]): string {
  return expand(h).replace(/:/g, "").split("").reverse().join(".") + ".ip6.arpa";
}

export function classify(h: number[]): string {
  const allZeroUpTo = (n: number) => h.slice(0, n).every((x) => x === 0);
  if (allZeroUpTo(7) && h[7] === 0) return "Unspecified (::)";
  if (allZeroUpTo(7) && h[7] === 1) return "Loopback (::1)";
  if (allZeroUpTo(5) && h[5] === 0xffff) return "IPv4-mapped (::ffff:0:0/96)";
  if (h[0] === 0x64 && h[1] === 0xff9b && h.slice(2, 6).every((x) => x === 0)) return "NAT64 well-known prefix (64:ff9b::/96)";
  if (h[0] === 0x2002) return "6to4 (2002::/16)";
  if (h[0] === 0x2001 && h[1] === 0) return "Teredo (2001::/32)";
  if (h[0] === 0x2001 && h[1] === 0xdb8) return "Documentation (2001:db8::/32)";
  if ((h[0]! & 0xffc0) === 0xfe80) return "Link-local unicast (fe80::/10)";
  if ((h[0]! & 0xfe00) === 0xfc00) return "Unique local (fc00::/7)";
  if ((h[0]! & 0xff00) === 0xff00) {
    const scope = ["reserved", "interface-local", "link-local", "realm-local", "admin-local", "site-local"][h[0]! & 0xf] ?? ((h[0]! & 0xf) === 0xe ? "global" : "unassigned");
    return `Multicast (ff00::/8), ${scope} scope`;
  }
  if ((h[0]! & 0xe000) === 0x2000) return "Global unicast (2000::/3)";
  return "Reserved / unassigned";
}

export function runIpv6(input: string, options: Ipv6AddressToolOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (!lines.length) return { output: "", error: null };
  const out: string[] = [];
  let firstErr: { message: string; line?: number } | null = null;
  lines.forEach((l, i) => {
    try {
      const h = parseIpv6(l);
      const rows = [`Compressed: ${compress(h)}`, `Expanded:   ${expand(h)}`];
      if (options.details) {
        rows.push(`Type:       ${classify(h)}`);
        rows.push(`Reverse:    ${reversePointer(h)}`);
        if (h.slice(0, 5).every((x) => x === 0) && h[5] === 0xffff)
          rows.push(`IPv4:       ${h[6]! >> 8}.${h[6]! & 255}.${h[7]! >> 8}.${h[7]! & 255}`);
      }
      out.push(`${l}\n${rows.map((r) => "  " + r).join("\n")}`);
    } catch (e) {
      firstErr ??= { message: `Line ${i + 1}: ${(e as Error).message}`, line: i + 1 };
      out.push(`${l}\n  ✗ ${(e as Error).message}`);
    }
  });
  return { output: out.join("\n\n"), error: firstErr };
}
