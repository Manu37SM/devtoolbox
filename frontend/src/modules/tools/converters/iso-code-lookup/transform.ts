import { formatCsv } from "@/lib/csv";
import type { TransformResult } from "@/lib/tool-transform";
import { COUNTRIES, CURRENCIES, LANGUAGES } from "./data";
import type { IsoCodeLookupOptions } from "./schema";

export interface Entry {
  kind: "country" | "currency" | "language";
  alpha2: string;
  alpha3: string;
  numeric: string;
  name: string;
  officialName: string;
}

const ENTRIES: Entry[] = [
  ...COUNTRIES.map(([a2, a3, num, name, official]): Entry => ({ kind: "country", alpha2: a2, alpha3: a3, numeric: num, name, officialName: official })),
  ...CURRENCIES.map(([a3, num, name]): Entry => ({ kind: "currency", alpha2: "", alpha3: a3, numeric: num, name, officialName: "" })),
  ...LANGUAGES.map(([a2, a3, name]): Entry => ({ kind: "language", alpha2: a2, alpha3: a3, numeric: "", name, officialName: "" })),
];

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

function matches(e: Entry, q: string, mode: IsoCodeLookupOptions["match"]): number {
  const codes = [e.alpha2, e.alpha3, e.numeric].filter(Boolean).map(fold);
  const names = [e.name, e.officialName].filter(Boolean).map(fold);
  const query = fold(q);
  if (!query) return 0;
  if (mode === "exact") return codes.includes(query) || names.includes(query) ? 3 : 0;
  if (mode === "starts") return codes.some((c) => c.startsWith(query)) || names.some((n) => n.startsWith(query)) ? 2 : 0;
  if (mode === "contains") return codes.some((c) => c.includes(query)) || names.some((n) => n.includes(query)) ? 1 : 0;
  // smart: exact code or name first, then names starting with the query, then containing it
  if (codes.includes(query) || names.includes(query)) return 4;
  if (/^\d+$/.test(query) && e.numeric && Number(e.numeric) === Number(query)) return 4;
  if (query.length >= 3 && names.some((n) => n.startsWith(query))) return 3;
  if (query.length >= 3 && names.some((n) => n.includes(query))) return 2;
  return 0;
}

export function isoCodeLookup(input: string, options: Partial<IsoCodeLookupOptions>): TransformResult {
  const o: IsoCodeLookupOptions = {
    type: options.type ?? "all", match: options.match ?? "smart", output: options.output ?? "table", limit: options.limit ?? 25,
    listAllWhenEmpty: options.listAllWhenEmpty ?? true, includeOfficialName: options.includeOfficialName ?? false, codeForm: options.codeForm ?? "alpha2",
  };
  const pool = ENTRIES.filter((e) => o.type === "all" || e.kind === o.type);
  const queries = input.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
  let hits: { query: string; entry: Entry }[] = [];
  if (!queries.length) {
    if (!o.listAllWhenEmpty || o.type === "all") return { output: "", error: null };
    hits = pool.map((entry) => ({ query: "", entry }));
  } else {
    for (const q of queries) {
      const scored = pool.map((entry) => ({ entry, score: matches(entry, q, o.match) })).filter((x) => x.score > 0);
      scored.sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name));
      const top = scored.slice(0, o.limit);
      if (!top.length) hits.push({ query: q, entry: { kind: "country", alpha2: "", alpha3: "", numeric: "", name: "", officialName: "" } });
      for (const s of top) hits.push({ query: q, entry: s.entry });
    }
  }
  const found = hits.filter((h) => h.entry.name);
  if (!found.length) return { output: "", error: { message: `Nothing found for ${queries.map((q) => `"${q}"`).join(", ")}. Try part of a name, or a 2-letter, 3-letter or numeric code.` } };

  if (o.output === "codes") {
    const key = o.codeForm === "alpha2" ? "alpha2" : o.codeForm === "alpha3" ? "alpha3" : "numeric";
    return { output: found.map((h) => h.entry[key]).filter(Boolean).join("\n"), error: null };
  }
  const header = ["type", "alpha-2", "alpha-3", "numeric", "name", ...(o.includeOfficialName ? ["official name"] : [])];
  const rows = found.map((h) => [h.entry.kind, h.entry.alpha2, h.entry.alpha3, h.entry.numeric, h.entry.name, ...(o.includeOfficialName ? [h.entry.officialName] : [])]);
  if (o.output === "csv") return { output: formatCsv([header, ...rows], ","), error: null };
  if (o.output === "json") {
    return { output: JSON.stringify(found.map((h) => ({ type: h.entry.kind, ...(h.entry.alpha2 ? { alpha2: h.entry.alpha2 } : {}), alpha3: h.entry.alpha3, ...(h.entry.numeric ? { numeric: h.entry.numeric } : {}), name: h.entry.name, ...(o.includeOfficialName && h.entry.officialName ? { officialName: h.entry.officialName } : {}) })), null, 2), error: null };
  }
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i]!.length)));
  const line = (r: string[]) => r.map((c, i) => c.padEnd(widths[i]!)).join("  ").trimEnd();
  const missing = hits.filter((h) => !h.entry.name).map((h) => h.query);
  return { output: [line(header), line(widths.map((w) => "-".repeat(w))), ...rows.map(line), ...(missing.length ? ["", `No match: ${missing.join(", ")}`] : [])].join("\n"), error: null };
}
