import type { TransformResult } from "@/lib/tool-transform";
import type { ReadingTimeEstimatorOptions } from "./schema";

export function fmtMinutes(minutes: number): string {
  const secs = Math.max(1, Math.round(minutes * 60));
  if (secs < 60) return `${secs} sec`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m >= 60) return `${Math.floor(m / 60)} h ${m % 60} min`;
  return s ? `${m} min ${s} sec` : `${m} min`;
}

export function estimateReading(input: string, o: ReadingTimeEstimatorOptions): TransformResult {
  if (input.trim() === "") return { output: "", error: null };
  const base = o.countImages ? input.replace(/!\[[^\]]*\]\([^)]*\)|<img\b[^>]*>/gi, " ") : input;
  const text = o.stripMarkdown ? base.replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ").replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/[#>*_~|-]{1,}/g, " ") : base;
  const cjk = (text.match(/[぀-ヿ㐀-鿿가-힯]/g) ?? []).length;
  const words = (text.replace(/[぀-ヿ㐀-鿿가-힯]/g, " ").match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []).length;
  const effectiveWords = words + cjk / 2; // ~2 CJK characters per word-equivalent
  const sentences = (input.match(/[^.!?。！？]+[.!?。！？]+/g) ?? []).length || 1;
  const paragraphs = input.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const images = o.countImages ? (input.match(/!\[[^\]]*\]\([^)]*\)|<img\b/gi) ?? []).length : 0;
  let imageSeconds = 0;
  for (let i = 0; i < images; i++) imageSeconds += Math.max(3, 12 - i); // Medium's heuristic: 12s, 11s, … floor 3s
  const readMin = effectiveWords / o.wpm + imageSeconds / 60;
  const speakMin = effectiveWords / 150;
  return {
    output: [
      `Reading time   ${fmtMinutes(readMin)}  (at ${o.wpm} wpm)`,
      `Speaking time  ${fmtMinutes(speakMin)}  (at 150 wpm)`,
      "",
      `Words       ${words}${cjk ? ` + ${cjk} CJK characters` : ""}`,
      `Characters  ${input.length}  (${input.replace(/\s/g, "").length} without spaces)`,
      `Sentences   ${sentences}`,
      `Paragraphs  ${paragraphs}`,
      `Avg words per sentence  ${(words / sentences).toFixed(1)}`,
      ...(images ? [`Images  ${images}`] : []),
    ].join("\n"),
    error: null,
  };
}
