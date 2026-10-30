import type { TransformResult } from "@/lib/tool-transform";
import { formatCsv } from "@/lib/csv";
import type { SqlInsertParserOptions } from "./schema";

export type SqlValue = { kind: "string" | "number" | "null" | "bool" | "raw"; text: string };
export interface ParsedTable {
  name: string;
  columns: string[];
  rows: SqlValue[][];
}

class Fail extends Error {
  constructor(message: string, readonly pos: number) {
    super(message);
  }
}

/** Removes -- and block comments outside strings, keeping the text length-neutral for error lines. */
function stripComments(sql: string, backslash: boolean): string {
  let out = "";
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      while (j < sql.length) {
        if (backslash && sql[j] === "\\") j += 2;
        else if (sql[j] === c) {
          if (sql[j + 1] === c) j += 2;
          else break;
        } else j++;
      }
      out += sql.slice(i, j + 1);
      i = j;
    } else if (c === "-" && sql[i + 1] === "-") {
      while (i < sql.length && sql[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && sql[i + 1] === "*") {
      const end = sql.indexOf("*/", i + 2);
      const stop = end < 0 ? sql.length : end + 2;
      out += sql.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop - 1;
    } else out += c;
  }
  return out;
}

class Scanner {
  i = 0;
  constructor(readonly s: string, readonly backslash: boolean) {}
  ws() {
    while (this.i < this.s.length && /\s/.test(this.s[this.i] as string)) this.i++;
  }
  peek() {
    this.ws();
    return this.s[this.i];
  }
  keyword(kw: string): boolean {
    this.ws();
    const m = new RegExp(`^${kw}\\b`, "i").exec(this.s.slice(this.i, this.i + kw.length + 2));
    if (!m) return false;
    this.i += kw.length;
    return true;
  }
  ident(): string {
    this.ws();
    const parts: string[] = [];
    for (;;) {
      this.ws();
      const c = this.s[this.i];
      let name: string;
      if (c === '"' || c === "`" || c === "[") {
        const close = c === "[" ? "]" : c;
        let j = this.i + 1;
        name = "";
        while (j < this.s.length && !(this.s[j] === close && this.s[j + 1] !== close)) {
          if (this.s[j] === close) j++;
          name += this.s[j++];
        }
        if (j >= this.s.length) throw new Fail("Unterminated quoted identifier", this.i);
        this.i = j + 1;
      } else {
        const m = /^[A-Za-z_@#$][\w$#@]*/.exec(this.s.slice(this.i));
        if (!m) throw new Fail("Expected a table or column name", this.i);
        name = m[0];
        this.i += name.length;
      }
      parts.push(name);
      if (this.s[this.i] === ".") this.i++;
      else break;
    }
    return parts[parts.length - 1] as string;
  }
  string(): string {
    const q = this.s[this.i];
    let j = this.i + 1;
    let out = "";
    for (; j < this.s.length; j++) {
      const c = this.s[j];
      if (this.backslash && c === "\\" && j + 1 < this.s.length) {
        const n = this.s[++j];
        out += n === "n" ? "\n" : n === "t" ? "\t" : n === "r" ? "\r" : n === "0" ? "\0" : n;
      } else if (c === q) {
        if (this.s[j + 1] === q) {
          out += q;
          j++;
        } else {
          this.i = j + 1;
          return out;
        }
      } else out += c;
    }
    throw new Fail("Unterminated string literal", this.i);
  }
  value(): SqlValue {
    this.ws();
    const c = this.s[this.i];
    if (c === "'") return { kind: "string", text: this.string() };
    const prefixed = /^(?:N|n|E|e)'/.exec(this.s.slice(this.i, this.i + 2));
    if (prefixed) {
      this.i++;
      return { kind: "string", text: this.string() };
    }
    const bin = /^[Xx]'([0-9A-Fa-f]*)'/.exec(this.s.slice(this.i));
    if (bin) {
      this.i += bin[0].length;
      return { kind: "raw", text: bin[0] };
    }
    const num = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?(?![\w.])/.exec(this.s.slice(this.i));
    if (num) {
      this.i += num[0].length;
      return { kind: "number", text: num[0] };
    }
    // anything else: read a balanced expression up to the next top-level comma or closing paren
    const start = this.i;
    let depth = 0;
    while (this.i < this.s.length) {
      const ch = this.s[this.i];
      if (ch === "'") this.string();
      else if (ch === "(") {
        depth++;
        this.i++;
      } else if (ch === ")") {
        if (depth === 0) break;
        depth--;
        this.i++;
      } else if (ch === "," && depth === 0) break;
      else this.i++;
    }
    const text = this.s.slice(start, this.i).trim();
    if (!text) throw new Fail("Expected a value", start);
    if (/^null$/i.test(text)) return { kind: "null", text: "" };
    if (/^(true|false)$/i.test(text)) return { kind: "bool", text: text.toLowerCase() };
    return { kind: "raw", text };
  }
}

export function parseSqlInserts(sql: string, backslash = false): { tables: ParsedTable[]; skipped: number } {
  const clean = stripComments(sql, backslash);
  const sc = new Scanner(clean, backslash);
  const tables = new Map<string, ParsedTable>();
  let skipped = 0;
  const intoRe = /\bINTO\b/gi;
  let m: RegExpExecArray | null;
  while ((m = intoRe.exec(clean))) {
    const stmtStart = clean.lastIndexOf(";", m.index) + 1;
    if (!/\bINSERT\b|\bINTO\b[\s\S]*\bINTO\b/i.test(clean.slice(stmtStart, m.index + 4))) continue;
    sc.i = m.index + 4;
    try {
      const table = sc.ident();
      let columns: string[] | null = null;
      if (sc.peek() === "(") {
        sc.i++;
        columns = [];
        for (;;) {
          columns.push(sc.ident());
          const n = sc.peek();
          sc.i++;
          if (n === ")") break;
          if (n !== ",") throw new Fail("Bad column list", sc.i);
        }
      }
      if (!sc.keyword("VALUES") && !sc.keyword("VALUE")) {
        skipped++;
        continue;
      }
      const t = tables.get(table.toLowerCase()) ?? { name: table, columns: [], rows: [] };
      tables.set(table.toLowerCase(), t);
      const names = columns ?? null;
      for (;;) {
        if (sc.peek() !== "(") throw new Fail("Expected ( before a row", sc.i);
        sc.i++;
        const values: SqlValue[] = [];
        for (;;) {
          values.push(sc.value());
          const n = sc.peek();
          sc.i++;
          if (n === ")") break;
          if (n !== ",") throw new Fail("Expected , or ) in a row", sc.i);
        }
        const cols = names ?? values.map((_, i) => `col${i + 1}`);
        if (cols.length !== values.length) throw new Fail(`Row has ${values.length} values for ${cols.length} columns`, sc.i);
        const row: SqlValue[] = new Array(t.columns.length).fill(null).map(() => ({ kind: "null", text: "" }) as SqlValue);
        cols.forEach((c, i) => {
          let idx = t.columns.indexOf(c);
          if (idx < 0) {
            t.columns.push(c);
            idx = t.columns.length - 1;
            t.rows.forEach((r) => r.push({ kind: "null", text: "" }));
            row.push({ kind: "null", text: "" });
          }
          row[idx] = values[i] as SqlValue;
        });
        t.rows.push(row);
        if (sc.peek() === ",") sc.i++;
        else break;
      }
      intoRe.lastIndex = sc.i;
    } catch (e) {
      if (e instanceof Fail) {
        const line = clean.slice(0, e.pos).split("\n").length;
        throw Object.assign(new Error(`${e.message} (line ${line})`), { line });
      }
      throw e;
    }
  }
  return { tables: [...tables.values()], skipped };
}

const cell = (v: SqlValue, nullAs: SqlInsertParserOptions["nullAs"]) => (v.kind === "null" ? (nullAs === "empty" ? "" : nullAs) : v.text);
const jsonValue = (v: SqlValue, typed: boolean): unknown => {
  if (v.kind === "null") return null;
  if (typed && v.kind === "bool") return v.text === "true";
  if (typed && v.kind === "number") {
    const n = Number(v.text);
    return Number.isSafeInteger(n) || (!Number.isInteger(n) && v.text.length < 16) ? n : v.text;
  }
  return v.text;
};

export function convertSqlInserts(input: string, options: Partial<SqlInsertParserOptions>): TransformResult {
  const o: SqlInsertParserOptions = {
    output: options.output ?? "csv",
    table: options.table ?? "",
    nullAs: options.nullAs ?? "empty",
    backslashEscapes: options.backslashEscapes ?? false,
    typedJson: options.typedJson ?? true,
    includeTableColumn: options.includeTableColumn ?? false,
  };
  if (!input.trim()) return { output: "", error: null };
  let parsed;
  try {
    parsed = parseSqlInserts(input, o.backslashEscapes);
  } catch (e) {
    const err = e as Error & { line?: number };
    return { output: "", error: { message: err.message, line: err.line } };
  }
  let tables = parsed.tables;
  if (o.table.trim()) tables = tables.filter((t) => t.name.toLowerCase() === o.table.trim().toLowerCase());
  if (!tables.length) {
    return { output: "", error: { message: o.table.trim() ? `No INSERT into "${o.table.trim()}" found. Tables: ${parsed.tables.map((t) => t.name).join(", ") || "none"}.` : "No INSERT ... VALUES statements found." + (parsed.skipped ? " INSERT ... SELECT is not supported." : "") } };
  }
  const withTable = o.includeTableColumn && tables.length > 1;
  if (o.output === "json") {
    const rowsOf = (t: ParsedTable) => t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, jsonValue(r[i] as SqlValue, o.typedJson)])));
    const data = tables.length === 1 ? rowsOf(tables[0] as ParsedTable) : Object.fromEntries(tables.map((t) => [t.name, rowsOf(t)]));
    return { output: JSON.stringify(data, null, 2), error: null };
  }
  const sections = tables.map((t) => {
    const head = withTable ? ["table", ...t.columns] : t.columns;
    const body = t.rows.map((r) => (withTable ? [t.name] : []).concat(r.map((v) => cell(v, o.nullAs))));
    return { name: t.name, rows: [head, ...body] };
  });
  const render = (rows: string[][]) => {
    if (o.output === "csv") return formatCsv(rows, ",");
    if (o.output === "tsv") return rows.map((r) => r.map((v) => v.replace(/[\t\r\n]+/g, " ")).join("\t")).join("\n");
    const esc = (v: string) => v.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
    const head = rows[0] ?? [];
    return [`| ${head.map(esc).join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.slice(1).map((r) => `| ${r.map(esc).join(" | ")} |`)].join("\n");
  };
  const text = sections.length === 1 ? render(sections[0]!.rows) : sections.map((s) => `${o.output === "markdown" ? "### " : "# "}${s.name}\n${render(s.rows)}`).join("\n\n");
  return { output: text, error: null };
}
