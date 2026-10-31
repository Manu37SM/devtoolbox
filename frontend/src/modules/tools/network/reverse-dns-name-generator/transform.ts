import type { TransformResult } from "@/lib/tool-transform";
import type { ReverseDnsNameGeneratorOptions } from "./schema";

const MAX_ZONES = 256;

function parseV4(s: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (!m) return null;
  const o = m.slice(1).map(Number);
  return o.every((x) => x <= 255) && m.slice(1).every((p) => p === "0" || !p.startsWith("0")) ? o : null;
}

/** Returns 32 hex nibbles, or null. Accepts :: and a trailing dotted quad. */
export function parseV6(input: string): string | null {
  let s = input.toLowerCase();
  if (s.includes("%") || !/^[0-9a-f:.]+$/.test(s)) return null;
  const tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(s);
  if (tail) {
    const q = parseV4(tail[1]!);
    if (!q) return null;
    s = s.slice(0, tail.index) + ((q[0]! << 8) | q[1]!).toString(16) + ":" + ((q[2]! << 8) | q[3]!).toString(16);
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const side = (x: string) => (x === "" ? [] : x.split(":"));
  const head = side(halves[0]!), rest = halves.length === 2 ? side(halves[1]!) : [];
  if ([...head, ...rest].some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  let groups: string[];
  if (halves.length === 2) {
    const fill = 8 - head.length - rest.length;
    if (fill < 1) return null;
    groups = [...head, ...Array<string>(fill).fill("0"), ...rest];
  } else groups = head;
  if (groups.length !== 8) return null;
  return groups.map((g) => g.padStart(4, "0")).join("");
}

export const v4Ptr = (o: number[]) => `${[...o].reverse().join(".")}.in-addr.arpa`;
export const v6Ptr = (nibbles: string) => `${[...nibbles].reverse().join(".")}.ip6.arpa`;

export function reverseDnsNameGenerator(input: string, options: Partial<ReverseDnsNameGeneratorOptions>): TransformResult {
  const o: ReverseDnsNameGeneratorOptions = {
    bind: options.bind ?? true, hostname: options.hostname ?? "host.example.com.", ttl: options.ttl ?? 3600,
    classlessSeparator: options.classlessSeparator ?? "/", trailingDot: options.trailingDot ?? true,
  };
  const fail = (message: string): TransformResult => ({ output: "", error: { message } });
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (!lines.length) return { output: "", error: null };
  if (o.bind && !/^[A-Za-z0-9._-]+$/.test(o.hostname)) return fail("Host name may only contain letters, digits, dots, hyphens and underscores.");
  const dot = o.trailingDot ? "." : "";
  const host = o.hostname.endsWith(".") ? o.hostname : o.hostname + ".";
  const blocks: string[] = [];

  for (const [i, line] of lines.entries()) {
    const [addr, plen] = line.split("/");
    const L: string[] = [line];
    const v4 = parseV4(addr!);
    const v6 = v4 ? null : parseV6(addr!);
    if (!v4 && !v6) return fail(`Line ${i + 1}: "${line}" is not an IPv4/IPv6 address or CIDR block.`);
    const max = v4 ? 32 : 128;
    const prefix = plen === undefined ? max : /^\d+$/.test(plen) ? Number(plen) : NaN;
    if (!(prefix >= 0 && prefix <= max)) return fail(`Line ${i + 1}: prefix length must be 0–${max}.`);

    if (v4) {
      const n = ((v4[0]! * 256 + v4[1]!) * 256 + v4[2]!) * 256 + v4[3]!;
      const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
      const base = (n & mask) >>> 0;
      const octets = (x: number) => [x >>> 24, (x >>> 16) & 255, (x >>> 8) & 255, x & 255];
      if (plen === undefined || prefix === 32) {
        L.push(`  PTR name   ${v4Ptr(v4)}${dot}`);
        const zone = `${v4[2]}.${v4[1]}.${v4[0]}.in-addr.arpa`;
        L.push(`  /24 zone   ${zone}${dot}  (owner "${v4[3]}")`);
        if (o.bind) L.push("", `  ; in ${zone}`, `  ${v4[3]}\t${o.ttl}\tIN\tPTR\t${host}`);
      } else if (prefix % 8 === 0) {
        const keep = octets(base).slice(0, prefix / 8);
        L.push(`  Zone       ${[...keep].reverse().join(".")}${keep.length ? "." : ""}in-addr.arpa${dot}`);
        if (prefix === 0) L.push("  (the whole IPv4 reverse tree: you do not delegate this)");
      } else if (prefix < 24) {
        const fullOctets = Math.floor(prefix / 8);
        const childLen = (fullOctets + 1) * 8; // zone granularity: next octet boundary
        const count = 2 ** (childLen - prefix);
        const size = 2 ** (32 - childLen);
        const parent = [...octets(base).slice(0, fullOctets)].reverse().join(".");
        L.push(`  Not octet-aligned: delegate ${count} zone${count === 1 ? "" : "s"} of /${childLen}${count > 1 ? ` under ${parent}${parent ? "." : ""}in-addr.arpa` : ""}`);
        for (let k = 0; k < Math.min(count, MAX_ZONES); k++) {
          const keep = octets((base + k * size) >>> 0).slice(0, childLen / 8);
          L.push(`  ${[...keep].reverse().join(".")}.in-addr.arpa${dot}`);
        }
        if (count > MAX_ZONES) L.push(`  … ${count - MAX_ZONES} more`);
      } else {
        // RFC 2317 classless delegation inside a /24
        const size = 2 ** (32 - prefix);
        const parentZone = `${v4[2]}.${v4[1]}.${v4[0]}.in-addr.arpa`;
        const first = base & 255;
        const label = `${first}${o.classlessSeparator}${prefix}`;
        const zone = `${label}.${parentZone}`;
        L.push(`  RFC 2317 zone  ${zone}${dot}`, `  Parent zone    ${parentZone}${dot}  (the ISP's /24 reverse zone)`);
        if (o.bind) {
          L.push("", `  ; in ${parentZone}  (delegate the sub-zone, then alias each address into it)`);
          const nsHint = `ns1.example.com.`;
          L.push(`  ${label}\t${o.ttl}\tIN\tNS\t${nsHint}`);
          for (let k = 0; k < Math.min(size, MAX_ZONES); k++) L.push(`  ${first + k}\t${o.ttl}\tIN\tCNAME\t${first + k}.${label}.${parentZone}.`);
          L.push("", `  ; in ${zone}`);
          L.push(`  ${first + (size > 1 ? 1 : 0)}\t${o.ttl}\tIN\tPTR\t${host}   ; example record`);
        }
      }
    } else {
      const nib = v6!;
      const nibblePrefix = Math.ceil(prefix / 4);
      const mask = (hex: string, bits: number) => {
        let out = "";
        for (let k = 0; k < 32; k++) {
          const v = parseInt(hex[k]!, 16);
          const keep = Math.max(0, Math.min(4, bits - k * 4));
          out += (v & ((0xf << (4 - keep)) & 0xf)).toString(16);
        }
        return out;
      };
      if (plen === undefined || prefix === 128) {
        L.push(`  PTR name   ${v6Ptr(nib)}${dot}`);
        if (o.bind) {
          const zone64 = v6Ptr(nib.slice(0, 16));
          L.push("", `  ; in ${zone64}`, `  ${[...nib.slice(16)].reverse().join(".")}\t${o.ttl}\tIN\tPTR\t${host}`);
        }
      } else {
        const base = mask(nib, prefix);
        if (prefix % 4 === 0) {
          L.push(`  Zone       ${prefix === 0 ? "ip6.arpa" : v6Ptr(base.slice(0, nibblePrefix))}${dot}`);
          if (prefix < 32) L.push("  (a short prefix: delegations normally happen at /32 to /64)");
        } else {
          const bitsLeft = nibblePrefix * 4 - prefix;
          const count = 2 ** bitsLeft;
          L.push(`  Not nibble-aligned: delegate ${count} zones of /${nibblePrefix * 4}`);
          const lastNibble = parseInt(base[nibblePrefix - 1]!, 16);
          for (let k = 0; k < count; k++) {
            const t = base.slice(0, nibblePrefix - 1) + (lastNibble + k * 1).toString(16);
            L.push(`  ${v6Ptr(t)}${dot}`);
          }
        }
        L.push(`  Prefix     ${nib.slice(0, nibblePrefix).replace(/(.{4})/g, "$1:").replace(/:$/, "")}${nibblePrefix % 4 ? "" : "::"}/${prefix}`);
      }
    }
    blocks.push(L.join("\n"));
  }
  return { output: blocks.join("\n\n") + "\n", error: null };
}
