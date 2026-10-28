import type { TransformResult } from "@/lib/tool-transform";
import type { KubernetesResourceConverterOptions } from "./schema";

const MEM_UNITS: Record<string, number> = {
  "": 1, k: 1e3, K: 1e3, M: 1e6, G: 1e9, T: 1e12, P: 1e15, E: 1e18,
  Ki: 1024, Mi: 1024 ** 2, Gi: 1024 ** 3, Ti: 1024 ** 4, Pi: 1024 ** 5, Ei: 1024 ** 6,
};

export function parseCpu(v: string): number | null {
  const m = /^(\d+(?:\.\d+)?|\.\d+)(m?)$/.exec(v);
  if (!m) return null;
  const n = Number(m[1]);
  return m[2] ? n / 1000 : n;
}

export function parseMemory(v: string): number | null {
  const m = /^(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\d+)(Ki|Mi|Gi|Ti|Pi|Ei|k|K|M|G|T|P|E)?$/.exec(v);
  if (!m) return null;
  return Number(m[1]) * MEM_UNITS[m[2] ?? ""]!;
}

export function formatCores(cores: number): string {
  const milli = Math.round(cores * 1000);
  return Math.abs(milli - cores * 1000) < 1e-6 ? (milli % 1000 === 0 ? String(milli / 1000) : `${milli}m`) : `${cores}`;
}

export function formatBinary(bytes: number): string {
  if (!Number.isInteger(bytes) || bytes === 0) return String(bytes);
  for (const u of ["Ei", "Pi", "Ti", "Gi", "Mi", "Ki"]) {
    const f = MEM_UNITS[u]!;
    if (bytes % f === 0) return `${bytes / f}${u}`;
  }
  return String(bytes);
}

const round = (n: number, d = 3) => String(Number(n.toFixed(d)));

function describe(token: string, kind: KubernetesResourceConverterOptions["kind"]): string | null {
  const memLike = /(Ki|Mi|Gi|Ti|Pi|Ei|[kKMGTPE])$/.test(token);
  const cpuLike = /m$/.test(token);
  const wantCpu = kind === "cpu" || (kind === "auto" && !memLike);
  const wantMem = kind === "memory" || (kind === "auto" && memLike);
  if (wantCpu && !wantMem) {
    const c = parseCpu(token);
    if (c === null) return null;
    return `CPU: ${formatCores(c)} = ${round(c, 6)} cores = ${round(c * 1000, 3)} millicores`;
  }
  if (cpuLike) return null;
  const b = parseMemory(token);
  if (b === null) return null;
  return `Memory: ${formatBinary(b)} = ${b} bytes = ${round(b / 1024 ** 2)} MiB = ${round(b / 1024 ** 3, 4)} GiB = ${round(b / 1e6)} MB`;
}

export function convertKubernetesResources(input: string, options: KubernetesResourceConverterOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { output: "", error: null };
  const out: string[] = [];
  const bad: string[] = [];
  for (const line of lines) {
    const token = (line.includes(":") ? line.slice(line.lastIndexOf(":") + 1) : line).trim().replace(/^["']|["']$/g, "");
    const keyHint = /^\s*cpu\s*:/i.test(line) ? "cpu" : /^\s*(memory|ephemeral-storage)\s*:/i.test(line) ? "memory" : options.kind;
    const d = describe(token, keyHint as KubernetesResourceConverterOptions["kind"]);
    if (d) out.push(`${line}\n  ${d}`);
    else { bad.push(line); out.push(`${line}\n  Not a valid quantity`); }
  }
  return { output: out.join("\n\n"), error: bad.length ? { message: `Invalid quantity: ${bad.slice(0, 3).join(", ")}` } : null };
}
