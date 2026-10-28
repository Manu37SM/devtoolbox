import { dump } from "js-yaml";
import type { TransformResult } from "@/lib/tool-transform";
import type { AsciiTableParserOptions } from "./schema";

const BORDER = /^[\s+\-=|─━│┃┌┐└┘├┤┬┴┼╔╗╚╝╠╣╦╩╬═║╭╮╯╰:]+$/;
const PIPES = /[|│┃║]/;

/** Splits a header line into column start offsets for whitespace-aligned output (kubectl, ps, docker ps). */
export function columnStarts(header: string): number[] {
  const starts: number[] = [];
  const re = /\S+(?: \S+)*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(header))) starts.push(m.index);
  return starts;
}

export function parseTable(text: string): { header: string[]; rows: string[][] } | string {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim() !== "");
  const content = lines.filter((l) => !BORDER.test(l) || /[A-Za-z0-9]/.test(l.replace(/[-=:|+]/g, "")));
  const real = content.filter((l) => !(BORDER.test(l) && !/[A-Za-z0-9]/.test(l)));
  if (real.length < 1) return "No table rows found";
  if (real.some((l) => PIPES.test(l))) {
    const bordered = /^\s*[|│┃║]/.test(real[0]!);
    const cells = real.map((l) => (bordered ? l.trim().replace(/^[|│┃║]/, "").replace(/[|│┃║]$/, "") : l).split(/[|│┃║]/).map((c) => c.trim()));
    const width = cells[0]!.length;
    if (!bordered) for (const r of cells) while (r.length < width) r.push("");
    const ragged = cells.findIndex((r) => r.length !== width);
    if (ragged >= 0) return `Row ${ragged + 1} has ${cells[ragged]!.length} cells but the header has ${width}`;
    return { header: cells[0]!, rows: cells.slice(1) };
  }
  const starts = columnStarts(real[0]!);
  if (starts.length < 2) {
    const split = real.map((l) => l.trim().split(/\s{2,}|\t/));
    const w = split[0]!.length;
    if (w < 2) return "Could not find columns. Use |-separated tables or output with columns aligned by 2+ spaces";
    return { header: split[0]!, rows: split.slice(1).map((r) => Array.from({ length: w }, (_, i) => r[i] ?? "")) };
  }
  const slice = (l: string) => starts.map((s, i) => l.slice(s, i + 1 < starts.length ? starts[i + 1] : undefined).trim());
  return { header: slice(real[0]!), rows: real.slice(1).map(slice) };
}

function typed(v: string): string | number | boolean | null {
  if (v === "" || /^(null|NULL|<none>|<NULL>|-)$/.test(v)) return null;
  if (/^(true|false)$/i.test(v)) return v.toLowerCase() === "true";
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(v) && String(Number(v)) === v) return Number(v);
  return v;
}

const csvCell = (v: string, d: string) => (v.includes(d) || /["\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function runAsciiTable(input: string, o: AsciiTableParserOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const t = parseTable(input);
  if (typeof t === "string") return { output: "", error: { message: t } };
  const { header, rows } = t;
  switch (o.output) {
    case "csv": case "tsv": {
      const d = o.output === "csv" ? "," : "\t";
      return { output: [header, ...rows].map((r) => r.map((c) => csvCell(c, d)).join(d)).join("\n") + "\n", error: null };
    }
    case "markdown": {
      const w = header.map((h, i) => Math.max(h.length, 3, ...rows.map((r) => r[i]!.length)));
      const line = (r: string[]) => `| ${r.map((c, i) => c.replace(/\|/g, "\\|").padEnd(w[i]!)).join(" | ")} |`;
      return { output: [line(header), `| ${w.map((x) => "-".repeat(x)).join(" | ")} |`, ...rows.map(line)].join("\n") + "\n", error: null };
    }
    default: {
      const objs = rows.map((r) => Object.fromEntries(header.map((h, i) => [h || `column${i + 1}`, o.inferTypes ? typed(r[i]!) : r[i]!])));
      return { output: o.output === "yaml" ? dump(objs, { lineWidth: -1 }) : JSON.stringify(objs, null, 2), error: null };
    }
  }
}
