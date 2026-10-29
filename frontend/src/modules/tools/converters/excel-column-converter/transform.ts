import type { TransformResult } from "@/lib/tool-transform";
import type { ExcelColumnConverterOptions } from "./schema";

export const MAX_COL = 16384;
export const MAX_ROW = 1048576;

export function lettersToNumber(s: string): number {
  return [...s.toUpperCase()].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0);
}
export function numberToLetters(n: number): string {
  if (!Number.isInteger(n) || n < 1) throw new Error("Column numbers start at 1.");
  let s = "";
  while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

interface Cell { col: number; row: number }
const A1 = /^\$?([A-Za-z]{1,3})\$?(\d+)$/;
const R1C1 = /^R(\d+)C(\d+)$/i;

function parseCell(s: string): Cell | null {
  let m = A1.exec(s);
  if (m) return { col: lettersToNumber(m[1]!), row: Number(m[2]) };
  m = R1C1.exec(s);
  if (m) return { row: Number(m[1]), col: Number(m[2]) };
  return null;
}

const limits = (c: Cell) => (c.col > MAX_COL || c.row > MAX_ROW ? `  (beyond Excel's limit of XFD${MAX_ROW})` : "");

export function convertLine(raw: string, zeroBased: boolean): string {
  const line = raw.trim();
  const bang = line.lastIndexOf("!");
  const sheet = bang > 0 ? line.slice(0, bang + 1) : "";
  const ref = bang > 0 ? line.slice(bang + 1) : line;
  const off = zeroBased ? 1 : 0;
  if (/^\d+$/.test(ref)) {
    const n = Number(ref) + off;
    return `${ref} -> column ${numberToLetters(n)}${n > MAX_COL ? "  (beyond XFD, the last Excel column)" : ""}`;
  }
  if (/^[A-Za-z]{1,3}$/.test(ref)) {
    const n = lettersToNumber(ref);
    return `${ref.toUpperCase()} -> column ${n - off}${zeroBased ? " (0-based)" : ""}${n > MAX_COL ? "  (beyond XFD)" : ""}`;
  }
  if (/^R\[?-?\d*\]?C\[?-?\d*\]?$/i.test(ref) && /\[/.test(ref)) return `${line} -> relative R1C1 reference (offsets from the current cell); A1 form depends on where the formula sits.`;
  const range = ref.split(":");
  if (range.length === 2) {
    const a = parseCell(range[0]!), b = parseCell(range[1]!);
    if (!a || !b) return `${line} -> not a cell range`;
    const rows = Math.abs(b.row - a.row) + 1, cols = Math.abs(b.col - a.col) + 1;
    return `${line} -> ${sheet}R${a.row}C${a.col}:R${b.row}C${b.col} | ${sheet}${numberToLetters(a.col)}${a.row}:${numberToLetters(b.col)}${b.row} | ${rows} row${rows === 1 ? "" : "s"} x ${cols} column${cols === 1 ? "" : "s"} = ${(rows * cols).toLocaleString("en-US")} cells${limits(b)}`;
  }
  const c = parseCell(ref);
  if (!c) return `${line} -> not a column, cell or range`;
  if (c.row < 1 || c.col < 1) return `${line} -> rows and columns start at 1`;
  const idx = zeroBased ? `  (0-based: row ${c.row - 1}, col ${c.col - 1})` : "";
  return R1C1.test(ref) ? `${line} -> ${sheet}${numberToLetters(c.col)}${c.row}${idx}${limits(c)}` : `${line} -> ${sheet}R${c.row}C${c.col} | column ${c.col}, row ${c.row}${idx}${limits(c)}`;
}

export function runExcelColumnConverter(input: string, options: ExcelColumnConverterOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return { output: "", error: null };
  try { return { output: lines.map((l) => convertLine(l, options.zeroBased)).join("\n"), error: null }; }
  catch (e) { return { output: "", error: { message: (e as Error).message } }; }
}
