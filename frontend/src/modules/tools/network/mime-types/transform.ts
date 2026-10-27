import type { TransformResult } from "@/lib/tool-transform";
import type { MimeTypesOptions } from "./schema";
import { MIME_TYPES, type MimeEntry } from "./data";

export function searchMime(query: string): MimeEntry[] {
  const raw = query.trim().toLowerCase();
  if (raw === "") return MIME_TYPES;
  // Accept ".json", "*.json", "file.tar.gz", "report.PDF"
  const ext = raw.includes(".") ? raw.slice(raw.lastIndexOf(".") + 1) : raw;
  const exact = MIME_TYPES.filter(([e]) => e === ext);
  if (exact.length && !raw.includes("/")) return exact;
  return MIME_TYPES.filter(([e, m]) => e.includes(raw) || m.includes(raw));
}

export function lookupMime(input: string, options: MimeTypesOptions): TransformResult {
  const hits = searchMime(input);
  if (hits.length === 0) return { output: `Nothing matches "${input.trim()}".`, error: null };
  const lines = hits.map(([ext, mime]) => (options.format === "ext-first" ? `.${ext.padEnd(12)} ${mime}` : `${mime.padEnd(72)} .${ext}`));
  return { output: lines.join("\n"), error: null };
}
