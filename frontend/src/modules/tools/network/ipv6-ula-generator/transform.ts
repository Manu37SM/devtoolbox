import type { TransformResult } from "@/lib/tool-transform";
import type { Ipv6UlaGeneratorOptions } from "./schema";

const hex = (n: number, w = 4) => n.toString(16).padStart(w, "0");

/** RFC 4193: fd00::/8 + 40-bit random Global ID -> a /48 site prefix. */
export function makeUla(random: Uint8Array): { prefix: string; globalId: string; subnets: string[] } {
  const g = Array.from(random.slice(0, 5), (b) => hex(b, 2));
  const g1 = `fd${g[0]}`;
  const g2 = `${g[1]}${g[2]}`;
  const g3 = `${g[3]}${g[4]}`;
  const base = `${g1}:${g2}:${g3}`;
  return {
    prefix: `${base}::/48`,
    globalId: `${g[0]}${g[1]}${g[2]}${g[3]}${g[4]}`,
    subnets: Array.from({ length: 4 }, (_, i) => `${base}:${hex(i)}::/64`),
  };
}

export function generateUla(_input: string, options: Ipv6UlaGeneratorOptions, _nonce = 0): TransformResult {
  const count = Math.max(1, Math.min(50, Math.floor(options.count)));
  const blocks: string[] = [];
  for (let i = 0; i < count; i++) {
    const ula = makeUla(crypto.getRandomValues(new Uint8Array(5)));
    blocks.push(
      options.showSubnets
        ? `${ula.prefix}   (Global ID ${ula.globalId})\n${ula.subnets.map((s) => `  ${s}`).join("\n")}`
        : `${ula.prefix}`,
    );
  }
  return { output: blocks.join(options.showSubnets ? "\n\n" : "\n"), error: null };
}
