import type { TransformResult } from "@/lib/tool-transform";
import type { SourceMapResolverOptions } from "./schema";

/** [generatedColumn, sourceIndex, sourceLine, sourceColumn, nameIndex] (all 0-based); sourceIndex -1 = unmapped. */
export type Segment = [number, number, number, number, number];

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_INDEX: Record<string, number> = Object.fromEntries([...B64].map((c, i) => [c, i]));

export function decodeVlq(text: string): number[] {
  const out: number[] = [];
  let value = 0;
  let shift = 0;
  for (const ch of text) {
    const digit = B64_INDEX[ch];
    if (digit === undefined) throw new Error(`Invalid base64 VLQ character "${ch}"`);
    value += (digit & 31) * 2 ** shift;
    if (digit & 32) shift += 5;
    else {
      out.push(value % 2 === 1 ? -(value - 1) / 2 : value / 2);
      value = 0;
      shift = 0;
    }
  }
  if (shift !== 0) throw new Error("Truncated VLQ value");
  return out;
}

export function decodeMappings(mappings: string): Segment[][] {
  const lines: Segment[][] = [];
  let src = 0;
  let sl = 0;
  let sc = 0;
  let name = 0;
  for (const line of mappings.split(";")) {
    const segs: Segment[] = [];
    let gc = 0;
    if (line) {
      for (const seg of line.split(",")) {
        if (!seg) continue;
        const v = decodeVlq(seg);
        if (v.length !== 1 && v.length !== 4 && v.length !== 5) throw new Error(`A mapping segment has ${v.length} fields (expected 1, 4 or 5)`);
        const [d0 = 0, d1 = 0, d2 = 0, d3 = 0, d4 = 0] = v;
        gc += d0;
        if (v.length === 1) {
          segs.push([gc, -1, 0, 0, -1]);
          continue;
        }
        src += d1;
        sl += d2;
        sc += d3;
        if (v.length === 5) name += d4;
        segs.push([gc, src, sl, sc, v.length === 5 ? name : -1]);
      }
    }
    lines.push(segs);
  }
  return lines;
}

interface RawMap {
  version?: number;
  file?: string;
  sourceRoot?: string;
  sources?: string[];
  sourcesContent?: (string | null)[];
  names?: string[];
  mappings?: string;
  sections?: unknown[];
}

export interface Original {
  source: string;
  line: number; // 1-based
  column: number; // 0-based
  name: string | null;
}

export class SourceMap {
  readonly lines: Segment[][];
  constructor(readonly raw: RawMap) {
    this.lines = decodeMappings(raw.mappings ?? "");
  }
  sourceName(i: number): string {
    const s = this.raw.sources?.[i] ?? `source#${i}`;
    const root = this.raw.sourceRoot ?? "";
    return root && !/^([a-z][a-z0-9+.-]*:|\/)/i.test(s) ? root.replace(/\/?$/, "/") + s : s;
  }
  /** line is 1-based, column 0-based. */
  find(line: number, column: number, bias: "before" | "after"): Original | null {
    const segs = this.lines[line - 1];
    if (!segs?.length) return null;
    let lo = 0;
    let hi = segs.length - 1;
    let best = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (segs[mid]![0] <= column) {
        best = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    let seg: Segment | undefined;
    if (bias === "before") seg = best >= 0 ? segs[best] : undefined;
    else seg = segs[best >= 0 && segs[best]![0] === column ? best : best + 1];
    if (!seg || seg[1] < 0) return null;
    return { source: this.sourceName(seg[1]), line: seg[2] + 1, column: seg[3], name: seg[4] >= 0 ? (this.raw.names?.[seg[4]] ?? null) : null };
  }
  content(source: string): string[] | null {
    const i = (this.raw.sources ?? []).findIndex((_, k) => this.sourceName(k) === source);
    const text = i >= 0 ? this.raw.sourcesContent?.[i] : null;
    return typeof text === "string" ? text.split(/\r?\n/) : null;
  }
}

export function parseSourceMap(text: string): SourceMap {
  let json: RawMap;
  const body = text.trim().replace(/^\)\]\}'[^\n]*\n/, "");
  try {
    json = JSON.parse(body);
  } catch (e) {
    throw new Error(`The source map is not valid JSON: ${(e as Error).message}`);
  }
  if (json.sections) throw new Error("Indexed source maps (with \"sections\") are not supported yet.");
  if (typeof json.mappings !== "string" || !Array.isArray(json.sources)) throw new Error('This does not look like a source map: it needs "sources" and "mappings".');
  if (json.version !== undefined && json.version !== 3) throw new Error(`Unsupported source map version ${json.version}; expected 3.`);
  return new SourceMap(json);
}

/** The last "line:column" in a stack frame or a bare position. */
const POS = /(\d+)[:\s,](\d+)(\)?\s*)$/;

export function resolveSourceMap(mapText: string, positions: string, options: Partial<SourceMapResolverOptions>): TransformResult {
  const o: SourceMapResolverOptions = {
    columnBase: options.columnBase ?? "1",
    bias: options.bias ?? "before",
    context: options.context ?? 2,
    mode: options.mode ?? "lookup",
    stripPrefix: options.stripPrefix ?? "",
  };
  if (!mapText.trim()) return { output: "", error: null };
  let map: SourceMap;
  try {
    map = parseSourceMap(mapText);
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
  const strip = (s: string) => (o.stripPrefix && s.startsWith(o.stripPrefix) ? s.slice(o.stripPrefix.length) : s);

  if (o.mode === "sources") {
    const out = (map.raw.sources ?? []).map((_, i) => `${i}  ${strip(map.sourceName(i))}${map.raw.sourcesContent?.[i] ? "" : "  (no embedded source)"}`);
    out.push("", `${out.length} source(s), ${map.raw.names?.length ?? 0} name(s), ${map.lines.length} generated line(s)${map.raw.file ? `, file ${map.raw.file}` : ""}`);
    return { output: out.join("\n"), error: null };
  }
  if (o.mode === "mappings") {
    const out: string[] = [];
    map.lines.forEach((segs, li) =>
      segs.forEach((s) => {
        if (out.length < 5000) out.push(`${li + 1}:${s[0] + (o.columnBase === "1" ? 1 : 0)} → ${s[1] < 0 ? "(unmapped)" : `${strip(map.sourceName(s[1]))}:${s[2] + 1}:${s[3] + (o.columnBase === "1" ? 1 : 0)}${s[4] >= 0 ? ` ${map.raw.names?.[s[4]] ?? ""}` : ""}`}`);
      }),
    );
    return { output: out.join("\n"), error: null };
  }

  if (!positions.trim()) return { output: "", error: null };
  const out: string[] = [];
  let failed = 0;
  for (const raw of positions.split(/\r?\n/)) {
    if (!raw.trim()) {
      out.push("");
      continue;
    }
    const m = POS.exec(raw);
    if (!m) {
      out.push(raw);
      continue;
    }
    const line = Number(m[1]);
    const col = Number(m[2]) - (o.columnBase === "1" ? 1 : 0);
    const hit = col >= 0 ? map.find(line, col, o.bias) : null;
    const prefix = raw.slice(0, m.index);
    if (!hit) {
      failed++;
      out.push(`${raw}  → no mapping`);
      continue;
    }
    const where = `${strip(hit.source)}:${hit.line}:${hit.column + (o.columnBase === "1" ? 1 : 0)}`;
    // keep the frame text, swapping the generated "file:" for the original location
    const framed = /\(?[^\s()]*:$/.test(prefix) ? prefix.replace(/[^\s(]*:$/, "") : prefix;
    out.push(`${framed}${where}${m[3]}${hit.name ? `  [${hit.name}]` : ""}`.replace(/^(\s*at\s+)?/, "$1"));
    if (o.context > 0) {
      const src = map.content(hit.source);
      if (src) {
        for (let l = Math.max(1, hit.line - o.context); l <= Math.min(src.length, hit.line + o.context); l++) {
          out.push(`    ${l === hit.line ? ">" : " "} ${String(l).padStart(4)} | ${src[l - 1]}`);
          if (l === hit.line) out.push(`           | ${" ".repeat(hit.column)}^`);
        }
      }
    }
  }
  if (failed) out.push("", `${failed} position(s) had no mapping. Check the column base and that the map belongs to this build.`);
  return { output: out.join("\n"), error: null };
}
