import type { TransformResult } from "@/lib/tool-transform";
import type { RandomPortGeneratorOptions } from "./schema";

export const COMMON_PORTS = new Set([
  1433, 1521, 2049, 2181, 2375, 3000, 3001, 3306, 3389, 4000, 4200, 4222, 4369, 5000, 5001, 5173, 5432, 5601, 5672, 5900,
  6379, 6443, 7000, 7001, 8000, 8008, 8080, 8081, 8082, 8443, 8761, 8888, 9000, 9042, 9090, 9092, 9200, 9300, 11211, 15672, 27017,
]);

export function portRange(options: RandomPortGeneratorOptions): [number, number] {
  switch (options.range) {
    case "registered": return [1024, 49151];
    case "dynamic": return [49152, 65535];
    case "custom": return [Math.floor(options.min), Math.floor(options.max)];
    default: return [1024, 65535];
  }
}

export function randomInt(min: number, max: number, rand: () => number = secureUniform): number {
  return min + Math.floor(rand() * (max - min + 1));
}

function secureUniform(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]! / 2 ** 32;
}

export function generatePorts(_input: string, options: RandomPortGeneratorOptions, _nonce = 0, rand: () => number = secureUniform): TransformResult {
  const [min, max] = portRange(options);
  if (!(min >= 1 && max <= 65535 && min <= max)) return { output: "", error: { message: "Choose a range within 1–65535 where min ≤ max." } };

  const pool = max - min + 1 - (options.avoidCommon ? Array.from(COMMON_PORTS).filter((p) => p >= min && p <= max).length : 0);
  const count = Math.max(1, Math.min(100, Math.floor(options.count)));
  if (pool < count) return { output: "", error: { message: `Only ${pool} port(s) are available in this range; ask for fewer.` } };

  const picked = new Set<number>();
  while (picked.size < count) {
    const p = randomInt(min, max, rand);
    if (options.avoidCommon && COMMON_PORTS.has(p)) continue;
    picked.add(p);
  }
  const ports = Array.from(picked);
  if (options.sorted) ports.sort((a, b) => a - b);
  return { output: ports.join("\n"), error: null };
}
