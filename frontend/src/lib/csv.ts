/** RFC 4180 parsing and writing shared by the CSV tools. */

export type Delimiter = "," | "\t" | ";" | "|";

/** Picks the delimiter that gives the most consistent column count over the first lines. */
export function detectDelimiter(text: string): Delimiter {
  const sample = text.split(/\r?\n/).filter(Boolean).slice(0, 10);
  let best: Delimiter = ",";
  let bestScore = 0;
  for (const d of [",", "\t", ";", "|"] as Delimiter[]) {
    const counts = sample.map((l) => parseCsv(l, d)[0]?.length ?? 1);
    const first = counts[0] ?? 1;
    if (first < 2) continue;
    const score = counts.filter((c) => c === first).length * first;
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

export function parseCsv(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let any = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"' && cell === "") {
      quoted = true;
      any = true;
    } else if (ch === delim) {
      row.push(cell);
      cell = "";
      any = true;
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      any = false;
    } else {
      cell += ch;
      any = true;
    }
  }
  if (any || cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function formatCsv(rows: string[][], delim: string, eol = "\n"): string {
  const esc = (v: string) => (v.includes(delim) || /["\r\n]/.test(v) || /^\s|\s$/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return rows.map((r) => r.map(esc).join(delim)).join(eol);
}
