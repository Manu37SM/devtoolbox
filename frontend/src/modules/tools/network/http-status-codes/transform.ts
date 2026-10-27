import type { TransformResult } from "@/lib/tool-transform";
import type { HttpStatusCodesOptions } from "./schema";
import { CATEGORY_NAMES, HTTP_STATUS, type StatusEntry } from "./data";

export function searchStatuses(query: string): StatusEntry[] {
  const q = query.trim().toLowerCase();
  if (q === "") return HTTP_STATUS;
  const classMatch = /^([1-5])xx$/.exec(q);
  if (classMatch) return HTTP_STATUS.filter(([c]) => String(c).startsWith(classMatch[1]!));
  if (/^\d{1,3}$/.test(q)) return HTTP_STATUS.filter(([c]) => String(c).startsWith(q));
  const words = q.split(/\s+/);
  return HTTP_STATUS.filter(([c, name, desc]) => {
    const hay = `${c} ${name} ${desc} ${CATEGORY_NAMES[Math.floor(c / 100)]}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

export function lookupHttpStatus(input: string, options: HttpStatusCodesOptions): TransformResult {
  const hits = searchStatuses(input);
  if (hits.length === 0) return { output: `No status code matches "${input.trim()}".`, error: null };
  const blocks = hits.map(([code, name, desc]) =>
    options.compact ? `${code} ${name}` : `${code} ${name}  [${CATEGORY_NAMES[Math.floor(code / 100)]}]\n    ${desc}`,
  );
  return { output: blocks.join(options.compact ? "\n" : "\n\n"), error: null };
}
