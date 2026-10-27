import type { TransformResult } from "@/lib/tool-transform";
import type { DownloadTimeCalculatorOptions } from "./schema";

const SIZE_UNITS: Record<string, number> = {
  b: 1, kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12, pb: 1e15,
  kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3, tib: 1024 ** 4, pib: 1024 ** 5,
};
const RATE_BITS: Record<string, number> = { kbps: 1e3, mbps: 1e6, gbps: 1e9 };

export function parseSize(text: string): number | null {
  const m = /^(\d+(?:\.\d+)?)\s*([a-z]+)$/i.exec(text.trim().replace(/,/g, ""));
  if (!m) return null;
  const unit = m[2]!.toLowerCase();
  return Object.hasOwn(SIZE_UNITS, unit) ? Number(m[1]) * SIZE_UNITS[unit]! : null; // size units are BYTES
}

export function formatDuration(seconds: number): string {
  if (seconds < 1) return `${Math.max(1, Math.round(seconds * 1000))} ms`;
  const s = Math.round(seconds);
  const parts: string[] = [];
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (sec || parts.length === 0) parts.push(`${sec}s`);
  return parts.join(" ");
}

export function calcDownloadTime(input: string, options: DownloadTimeCalculatorOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { output: "", error: null };
  if (!(options.speed > 0)) return { output: "", error: { message: "Speed must be greater than zero." } };
  const bitsPerSecond = options.speed * RATE_BITS[options.speedUnit === "MBps" ? "mbps" : options.speedUnit.toLowerCase()]! * (options.speedUnit === "MBps" ? 8 : 1);
  const effective = bitsPerSecond * (options.efficiency / 100);
  const out: string[] = [];
  for (const [i, line] of lines.entries()) {
    const bytes = parseSize(line);
    if (bytes === null) return { output: "", error: { message: 'Expected a size like "4.5 GB" or "700 MiB".', line: i + 1 } };
    out.push(`${line}  →  ${formatDuration((bytes * 8) / effective)}`);
  }
  out.push("", `at ${options.speed} ${options.speedUnit} × ${options.efficiency}% efficiency ≈ ${(effective / 8 / 1e6).toFixed(2)} MB/s real throughput`);
  return { output: out.join("\n"), error: null };
}
