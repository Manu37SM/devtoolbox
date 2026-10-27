import type { TransformResult } from "@/lib/tool-transform";
import type { DataStorageConverterOptions } from "./schema";

const UNITS: Record<string, number> = {
  bit: 1 / 8, b: 1, kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12, pb: 1e15,
  kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, tib: 1024 ** 4, pib: 1024 ** 5,
};
const DEC = ["B", "KB", "MB", "GB", "TB", "PB"];
const BIN = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];

export function toBytes(text: string): number | null {
  const m = /^(\d+(?:\.\d+)?)\s*([a-z]+)$/i.exec(text.trim().replace(/,/g, ""));
  if (!m) return null;
  const u = m[2]!.toLowerCase();
  return Object.hasOwn(UNITS, u) ? Number(m[1]) * UNITS[u]! : null;
}

const fmt = (n: number) => {
  if (n === 0) return "0";
  if (Math.abs(n) >= 1e15 || Math.abs(n) < 1e-6) return n.toExponential(4);
  return Number(n.toPrecision(8)).toString();
};

export function convertStorage(input: string, options: DataStorageConverterOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  const out: string[] = [];
  for (const [i, line] of lines.entries()) {
    const bytes = toBytes(line);
    if (bytes === null) return { output: "", error: { message: 'Expected a size like "1.5 GB", "512 MiB" or "8 bit".', line: i + 1 } };
    const rows = [line];
    if (options.system !== "binary") rows.push(...DEC.map((u, k) => `  ${fmt(bytes / 1000 ** k).padStart(14)} ${u}`));
    if (options.system !== "decimal") rows.push(...BIN.map((u, k) => `  ${fmt(bytes / 1024 ** k).padStart(14)} ${u}`));
    rows.push(`  ${fmt(bytes * 8).padStart(14)} bits`);
    out.push(rows.join("\n"));
  }
  return { output: out.join("\n\n"), error: null };
}
