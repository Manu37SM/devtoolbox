import { parseCsv } from "@/lib/csv";

export type Row = Record<string, string>;

export function toTable(text: string, delim: string, header: boolean): { columns: string[]; rows: Row[] } | string {
  const raw = parseCsv(text, delim).filter((r) => !(r.length === 1 && r[0] === ""));
  if (!raw.length) return "empty";
  const width = Math.max(...raw.map((r) => r.length));
  let columns: string[];
  let body = raw;
  if (header) {
    columns = raw[0]!.map((h, i) => h.trim() || `column${i + 1}`);
    for (let i = columns.length; i < width; i++) columns.push(`column${i + 1}`);
    const seen = new Map<string, number>();
    columns = columns.map((c) => {
      const n = (seen.get(c) ?? 0) + 1;
      seen.set(c, n);
      return n > 1 ? `${c}_${n}` : c;
    });
    body = raw.slice(1);
  } else columns = Array.from({ length: width }, (_, i) => `column${i + 1}`);
  return { columns, rows: body.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i] ?? ""]))) };
}

export function resolveColumns(spec: string, columns: string[]): string[] | string {
  const out: string[] = [];
  for (const part of spec.split(",").map((s) => s.trim()).filter(Boolean)) {
    const byName = columns.find((c) => c === part) ?? columns.find((c) => c.toLowerCase() === part.toLowerCase());
    if (byName) out.push(byName);
    else if (/^\d+$/.test(part) && columns[Number(part) - 1]) out.push(columns[Number(part) - 1]!);
    else return `Column "${part}" was not found. Columns: ${columns.join(", ")}`;
  }
  return out;
}
