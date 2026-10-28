import type { TransformResult } from "@/lib/tool-transform";
import type { SubtitleConverterOptions } from "./schema";

export interface Cue { start: number; end: number; text: string; settings: string }

const TIME = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/;
const ARROW = new RegExp(`^\\s*(${TIME.source})\\s*-->\\s*(${TIME.source})(.*)$`);

function ms(h: string | undefined, m: string, s: string, f: string): number {
  return ((Number(h ?? 0) * 60 + Number(m)) * 60 + Number(s)) * 1000 + Number(f.padEnd(3, "0"));
}

export function formatTime(t: number, sep: "," | "."): string {
  const x = Math.max(0, Math.round(t));
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(x / 3600000))}:${p(Math.floor(x / 60000) % 60)}:${p(Math.floor(x / 1000) % 60)}${sep}${p(x % 1000, 3)}`;
}

export function parseSubtitles(input: string): Cue[] | { error: string; line: number } {
  const lines = input.replace(/^\uFEFF/, "").split(/\r?\n/);
  const cues: Cue[] = [];
  let i = 0;
  if (/^WEBVTT/.test(lines[0] ?? "")) { i = 1; while (i < lines.length && lines[i]!.trim() !== "") i++; }
  while (i < lines.length) {
    if (lines[i]!.trim() === "") { i++; continue; }
    // Skip NOTE / STYLE / REGION blocks.
    if (/^(NOTE|STYLE|REGION)\b/.test(lines[i]!)) { while (i < lines.length && lines[i]!.trim() !== "") i++; continue; }
    let m = ARROW.exec(lines[i]!);
    if (!m && i + 1 < lines.length) { m = ARROW.exec(lines[i + 1]!); if (m) i++; }
    if (!m) return { error: "Expected a timestamp line like 00:00:01,000 --> 00:00:02,500", line: i + 1 };
    // Groups: 1=full start, 2..5 start parts, 6=full end, 7..10 end parts, 11=settings
    const start = ms(m[2], m[3]!, m[4]!, m[5]!), end = ms(m[7], m[8]!, m[9]!, m[10]!);
    if (end < start) return { error: "End time is before start time", line: i + 1 };
    const settings = (m[11] ?? "").trim();
    i++;
    const text: string[] = [];
    while (i < lines.length && lines[i]!.trim() !== "") text.push(lines[i++]!);
    cues.push({ start, end, text: text.join("\n"), settings });
  }
  return cues;
}

export function runSubtitleConverter(input: string, o: SubtitleConverterOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const cues = parseSubtitles(input);
  if (!Array.isArray(cues)) return { output: "", error: { message: cues.error, line: cues.line } };
  if (!cues.length) return { output: "", error: { message: "No cues found" } };
  const sep = o.target === "vtt" ? "." : ",";
  const body = cues.map((c, idx) => {
    const text = o.target === "srt" ? c.text.replace(/<\/?(?:c|v|lang|ruby|rt)[^>]*>/g, "") : c.text;
    const settings = o.target === "vtt" && c.settings ? ` ${c.settings}` : "";
    const head = o.target === "srt" ? `${idx + 1}\n` : "";
    return `${head}${formatTime(c.start + o.shiftMs, sep)} --> ${formatTime(c.end + o.shiftMs, sep)}${settings}\n${text}`;
  }).join("\n\n");
  return { output: (o.target === "vtt" ? "WEBVTT\n\n" : "") + body + "\n", error: null };
}
