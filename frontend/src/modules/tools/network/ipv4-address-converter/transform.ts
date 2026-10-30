import type { TransformResult } from "@/lib/tool-transform";
import type { Ipv4AddressConverterOptions } from "./schema";

const MAX = 0xffffffff;

export function parseIpv4(text: string): number {
  const t = text.trim();
  let m: RegExpExecArray | null;
  if ((m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(t))) {
    const parts = m.slice(1).map(Number);
    if (parts.some((p) => p > 255)) throw new Error(`Octet out of range (0–255) in "${t}".`);
    return ((parts[0]! * 256 + parts[1]!) * 256 + parts[2]!) * 256 + parts[3]!;
  }
  if (/^[01]{1,8}(\.[01]{1,8}){3}$/.test(t) && t.includes(".")) {
    const parts = t.split(".").map((p) => parseInt(p, 2));
    return ((parts[0]! * 256 + parts[1]!) * 256 + parts[2]!) * 256 + parts[3]!;
  }
  if ((m = /^0x([0-9a-f]{1,8})$/i.exec(t))) return parseInt(m[1]!, 16);
  if ((m = /^0b([01]{1,32})$/i.exec(t)) || (m = /^([01]{32})$/.exec(t))) return parseInt(m[1]!, 2);
  if (/^\d+$/.test(t)) {
    const n = Number(t);
    if (n > MAX) throw new Error(`${t} is larger than 4294967295, the biggest IPv4 address.`);
    return n;
  }
  throw new Error(`"${t}" isn't a recognised IPv4 form (dotted, decimal, 0xHEX, binary).`);
}

/**
 * inet_aton(3) semantics: 1-4 parts, each decimal, 0-prefixed octal or 0x hex; the last part
 * fills the remaining bytes (a.b.c -> c is 16 bits, a.b -> b is 24 bits, a -> 32 bits).
 */
export function parseInetAton(text: string): number {
  const t = text.trim();
  const parts = t.split(".");
  if (parts.length < 1 || parts.length > 4 || parts.some((p) => p === "")) throw new Error(`"${t}" isn't an inet_aton address.`);
  const nums = parts.map((p) => {
    let v: number;
    if (/^0x[0-9a-f]+$/i.test(p)) v = parseInt(p.slice(2), 16);
    else if (/^0[0-7]*$/.test(p)) v = parseInt(p, 8);
    else if (/^[1-9]\d*$/.test(p)) v = Number(p);
    else throw new Error(`"${p}" in "${t}" is not decimal, octal (0…) or hex (0x…).`);
    return v;
  });
  const last = nums.pop()!;
  if (nums.some((v) => v > 255)) throw new Error(`Octet out of range (0–255) in "${t}".`);
  const lastMax = 2 ** (8 * (4 - nums.length)) - 1;
  if (last > lastMax) throw new Error(`Last part of "${t}" exceeds ${lastMax}.`);
  return nums.reduce((acc, v, i) => acc + v * 2 ** (8 * (3 - i)), 0) + last;
}

export const toDotted = (n: number) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");

function classify(n: number): string[] {
  const o1 = n >>> 24;
  const o2 = (n >>> 16) & 255;
  const tags: string[] = [];
  if (n === 0xffffffff) tags.push("limited broadcast");
  else if (o1 === 0) tags.push("“this network” (0.0.0.0/8)");
  else if (o1 === 10) tags.push("private (10.0.0.0/8)");
  else if (o1 === 127) tags.push("loopback (127.0.0.0/8)");
  else if (o1 === 172 && o2 >= 16 && o2 <= 31) tags.push("private (172.16.0.0/12)");
  else if (o1 === 192 && o2 === 168) tags.push("private (192.168.0.0/16)");
  else if (o1 === 169 && o2 === 254) tags.push("link-local (169.254.0.0/16)");
  else if (o1 === 100 && o2 >= 64 && o2 <= 127) tags.push("carrier-grade NAT (100.64.0.0/10)");
  else if ((n >>> 8) === 0xc00002 || (n >>> 8) === 0xc63364 || (n >>> 8) === 0xcb0071) tags.push("documentation (TEST-NET)");
  else if (o1 >= 224 && o1 <= 239) tags.push("multicast (224.0.0.0/4)");
  else if (o1 >= 240) tags.push("reserved (240.0.0.0/4)");
  else tags.push("public / globally routable");
  const cls = o1 < 128 ? "A" : o1 < 192 ? "B" : o1 < 224 ? "C" : o1 < 240 ? "D (multicast)" : "E (reserved)";
  tags.push(`legacy class ${cls}`);
  return tags;
}

export function describeIpv4(n: number): string {
  const hex = n.toString(16).padStart(8, "0");
  const bin = n.toString(2).padStart(32, "0").match(/.{8}/g)!.join(".");
  const octal = [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].map((p) => "0" + p.toString(8).padStart(3, "0")).join(".");
  const reverse = `${[n & 255, (n >>> 8) & 255, (n >>> 16) & 255, n >>> 24].join(".")}.in-addr.arpa`;
  return [
    `Dotted decimal   ${toDotted(n)}`,
    `Integer          ${n}`,
    `Hexadecimal      0x${hex.toUpperCase()}`,
    `Binary           ${bin}`,
    `Octal (dotted)   ${octal}`,
    `IPv4-mapped IPv6 ::ffff:${hex.slice(0, 4)}:${hex.slice(4)}  (also ::ffff:${toDotted(n)})`,
    `Reverse DNS      ${reverse}`,
    `Type             ${classify(n).join("; ")}`,
  ].join("\n");
}

const binDotted = (n: number) => n.toString(2).padStart(32, "0").match(/.{8}/g)!.join(".");
const hexOf = (n: number) => `0x${n.toString(16).padStart(8, "0").toUpperCase()}`;

export function convertIpv4Address(input: string, options: Partial<Ipv4AddressConverterOptions> = {}): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  const parse = (l: string) => {
    try {
      return parseIpv4(l);
    } catch (e) {
      if (options.inetAton) return parseInetAton(l);
      throw e;
    }
  };
  try {
    const nums = lines.map(parse);
    switch (options.output ?? "details") {
      case "dotted":
        return { output: nums.map(toDotted).join("\n"), error: null };
      case "integer":
        return { output: nums.map(String).join("\n"), error: null };
      case "hex":
        return { output: nums.map(hexOf).join("\n"), error: null };
      case "binary":
        return { output: nums.map(binDotted).join("\n"), error: null };
      case "csv":
        return {
          output: ["input,dotted,integer,hex", ...nums.map((n, i) => `${lines[i]!.includes(",") ? `"${lines[i]}"` : lines[i]},${toDotted(n)},${n},${hexOf(n)}`)].join("\n"),
          error: null,
        };
    }
    return {
      output: nums
        .map((n, i) => {
          const d = describeIpv4(n);
          // Flag inputs that only parse as inet_aton: they look like something else to a human.
          return options.inetAton && lines[i] !== toDotted(n) && !/^(0x|0b)?[0-9a-f]+$/i.test(lines[i]!)
            ? `Input            ${lines[i]}  →  resolves to ${toDotted(n)}\n${d}`
            : d;
        })
        .join("\n\n"),
      error: null,
    };
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "Could not parse the address." } };
  }
}
