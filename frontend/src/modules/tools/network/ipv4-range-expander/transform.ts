import type { TransformResult } from "@/lib/tool-transform";
import type { Ipv4RangeExpanderOptions } from "./schema";
import { parseIpv4, toDotted } from "../ipv4-address-converter/transform";

export function rangeToCidrs(start: number, end: number): string[] {
  const out: string[] = [];
  let cur = start;
  while (cur <= end) {
    // Largest block aligned at `cur` that doesn't overshoot `end`.
    let size = cur === 0 ? 2 ** 32 : cur & -cur;
    while (cur + size - 1 > end) size /= 2;
    out.push(`${toDotted(cur)}/${32 - Math.log2(size)}`);
    cur += size;
  }
  return out;
}

export function cidrToRange(cidr: string): { first: number; last: number; count: number; prefix: number } {
  const m = /^([^/\s]+)\/(\d{1,2})$/.exec(cidr.trim());
  if (!m) throw new Error(`"${cidr.trim()}" isn't a CIDR block (example: 10.0.0.0/24).`);
  const prefix = Number(m[2]);
  if (prefix > 32) throw new Error(`Prefix length /${prefix} is out of range (0–32).`);
  const count = 2 ** (32 - prefix);
  const first = Math.floor(parseIpv4(m[1]!) / count) * count;
  return { first, last: first + count - 1, count, prefix };
}

export function expandIpv4(input: string, options: Ipv4RangeExpanderOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  const blocks: string[] = [];
  try {
    for (const line of lines) {
      if (line.includes("/")) {
        const r = cidrToRange(line);
        const usable = r.prefix >= 31 ? r.count : r.count - 2;
        blocks.push(`${line}\n  ${toDotted(r.first)} – ${toDotted(r.last)}\n  ${r.count.toLocaleString("en-US")} addresses${options.showUsable ? `, ${usable.toLocaleString("en-US")} usable hosts` : ""}`);
      } else {
        const parts = line.split(/\s*(?:-|–|—|,|\bto\b)\s*|\s+/i).filter(Boolean);
        if (parts.length !== 2) throw new Error(`"${line}": enter a range as "start - end" or a CIDR block.`);
        const a = parseIpv4(parts[0]!);
        const b = parseIpv4(parts[1]!);
        if (a > b) throw new Error(`"${line}": the start address is after the end address.`);
        const cidrs = rangeToCidrs(a, b);
        blocks.push(`${toDotted(a)} – ${toDotted(b)}  (${(b - a + 1).toLocaleString("en-US")} addresses)\n${cidrs.map((c) => `  ${c}`).join("\n")}`);
      }
    }
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "Could not process input." } };
  }
  return { output: blocks.join("\n\n"), error: null };
}
