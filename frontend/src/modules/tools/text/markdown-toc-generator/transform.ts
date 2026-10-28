import type { TransformResult } from "@/lib/tool-transform";
import type { MarkdownTocGeneratorOptions } from "./schema";

export interface Heading { level: number; text: string; line: number }

/** Strip inline markdown so the TOC label is plain text. */
export function plainTitle(raw: string): string {
  return raw
    .replace(/\s+#+\s*$/, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__|\*|_|~~)(.+?)\1/g, "$2")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/** GitHub-compatible heading anchor. */
export function githubSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
}

export function extractHeadings(md: string): Heading[] {
  const out: Heading[] = [];
  let fence: string | null = null;
  md.split(/\r?\n/).forEach((line, i) => {
    const f = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (f) {
      if (!fence) fence = f[1]![0]!.repeat(3);
      else if (line.trim().startsWith(fence)) fence = null;
      return;
    }
    if (fence) return;
    const m = /^\s{0,3}(#{1,6})[ \t]+(.+?)\s*$/.exec(line);
    if (m) {
      const text = plainTitle(m[2]!);
      if (text) out.push({ level: m[1]!.length, text, line: i + 1 });
    }
  });
  return out;
}

export function generateToc(input: string, options: MarkdownTocGeneratorOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  if (options.minLevel > options.maxLevel) return { output: "", error: { message: "Min level must not exceed max level" } };
  const all = extractHeadings(input);
  const seen = new Map<string, number>();
  const withSlugs = all.map((h) => {
    const base = githubSlug(h.text);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return { ...h, slug: n === 0 ? base : `${base}-${n}` };
  });
  const picked = withSlugs.filter((h) => h.level >= options.minLevel && h.level <= options.maxLevel);
  if (!picked.length) return { output: "", error: { message: "No headings found in the selected level range" } };
  const counters: number[] = [];
  const base = Math.min(...picked.map((h) => h.level));
  const lines = picked.map((h) => {
    const depth = Math.max(0, h.level - base);
    let marker = options.bullet === "star" ? "*" : "-";
    if (options.bullet === "numbered") {
      counters.length = depth + 1;
      for (let i = 0; i <= depth; i++) counters[i] = counters[i] ?? 0;
      counters[depth] = (counters[depth] ?? 0) + 1;
      marker = `${counters[depth]}.`;
    }
    const label = options.links ? `[${h.text}](#${h.slug})` : h.text;
    return `${(options.bullet === "numbered" ? "   " : "  ").repeat(depth)}${marker} ${label}`;
  });
  return { output: lines.join("\n"), error: null };
}
