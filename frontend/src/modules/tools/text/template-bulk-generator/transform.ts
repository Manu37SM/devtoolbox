import type { TransformResult } from "@/lib/tool-transform";
import type { TemplateBulkGeneratorOptions } from "./schema";

type Row = Record<string, string>;

export function parseCsv(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
      continue;
    }
    if (ch === '"' && cell === "") { q = true; continue; }
    if (ch === delim) { row.push(cell); cell = ""; continue; }
    if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; continue; }
    cell += ch;
  }
  if (q) throw new Error("Unclosed quote in the data.");
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export function parseData(text: string): Row[] {
  const t = text.trim();
  if (t.startsWith("[") || t.startsWith("{")) {
    const v = JSON.parse(t) as unknown;
    const arr = Array.isArray(v) ? v : [v];
    return arr.map((o, i) => {
      if (typeof o !== "object" || o === null) throw new Error(`JSON item ${i + 1} is not an object.`);
      return Object.fromEntries(Object.entries(o).map(([k, val]) => [k, typeof val === "string" ? val : val === null || val === undefined ? "" : typeof val === "object" ? JSON.stringify(val) : String(val)]));
    });
  }
  const first = t.split(/\r?\n/)[0]!;
  const delim = first.includes("\t") ? "\t" : first.split(";").length > first.split(",").length ? ";" : ",";
  const rows = parseCsv(t, delim);
  const [head, ...body] = rows;
  if (!head) return [];
  const keys = head.map((h) => h.trim());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ""])));
}

const FILTERS: Record<string, (v: string, arg?: string) => string> = {
  upper: (v) => v.toUpperCase(),
  lower: (v) => v.toLowerCase(),
  title: (v) => v.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase()),
  trim: (v) => v.trim(),
  sql: (v) => `'${v.replace(/'/g, "''")}'`,
  sqlnum: (v) => { if (!/^-?\d+(\.\d+)?$/.test(v.trim())) throw new Error(`"${v}" is not a number (|sqlnum)`); return v.trim(); },
  json: (v) => JSON.stringify(v),
  url: (v) => encodeURIComponent(v),
  html: (v) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"),
  shell: (v) => `'${v.replace(/'/g, `'\\''`)}'`,
  default: (v, arg) => (v === "" ? arg ?? "" : v),
  pad: (v, arg) => v.padStart(Number(arg ?? 0), "0"),
  slug: (v) => v.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
};

export function render(template: string, row: Row, index: number, missing: TemplateBulkGeneratorOptions["missing"]): string {
  return template.replace(/\{\{\s*([^}|]+?)\s*((?:\|\s*[\w]+(?::[^|}]*)?\s*)*)\}\}/g, (all, rawName: string, filterPart: string) => {
    const name = rawName.trim();
    let v: string | undefined = name === "#" || name === "index" ? String(index + 1) : name === "index0" ? String(index) : row[name];
    const filters = filterPart.split("|").map((f) => f.trim()).filter(Boolean);
    if (v === undefined) {
      if (filters.some((f) => f.startsWith("default"))) v = "";
      else if (missing === "keep") return all;
      else if (missing === "error") throw new Error(`Row ${index + 1} has no column "${name}". Columns: ${Object.keys(row).join(", ")}`);
      else v = "";
    }
    for (const f of filters) {
      const [fname, ...rest] = f.split(":");
      const fn = FILTERS[fname!];
      if (!fn) throw new Error(`Unknown filter "${fname}". Available: ${Object.keys(FILTERS).join(", ")}`);
      v = fn(v, rest.length ? rest.join(":") : undefined);
    }
    return v;
  });
}

export function runTemplateBulkGenerator(template: string, data: string, options: TemplateBulkGeneratorOptions): TransformResult {
  if (!template.trim() || !data.trim()) return { output: "", error: null };
  let rows: Row[];
  try { rows = parseData(data); } catch (e) { return { output: "", error: { message: `Data: ${(e as Error).message}` } }; }
  if (!rows.length) return { output: "", error: { message: "No data rows. The first line must hold the column names." } };
  const sep = { newline: "\n", "blank-line": "\n\n", none: "", comma: ",\n" }[options.separator];
  try { return { output: rows.map((r, i) => render(template, r, i, options.missing)).join(sep), error: null }; }
  catch (e) { return { output: "", error: { message: (e as Error).message } }; }
}
