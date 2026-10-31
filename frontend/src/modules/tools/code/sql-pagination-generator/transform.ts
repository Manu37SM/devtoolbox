import type { TransformResult } from "@/lib/tool-transform";
import type { SqlPaginationGeneratorOptions } from "./schema";

type Opts = SqlPaginationGeneratorOptions;
type Dialect = Opts["dialect"];

/** Replace string literals, quoted identifiers, comments and parenthesised groups with spaces so keywords can be searched at top level. */
export function maskSql(sql: string): string {
  const out: string[] = [];
  let depth = 0;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i]!;
    const n = sql[i + 1];
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === c) {
          if (sql[j + 1] === c) j += 2;
          else break;
        } else j++;
      }
      out.push(" ".repeat(Math.min(j, sql.length - 1) - i + 1));
      i = j;
    } else if (c === "-" && n === "-") {
      let j = i;
      while (j < sql.length && sql[j] !== "\n") j++;
      out.push(" ".repeat(j - i));
      i = j - 1;
    } else if (c === "/" && n === "*") {
      const j = sql.indexOf("*/", i + 2);
      const end = j < 0 ? sql.length : j + 2;
      out.push(" ".repeat(end - i));
      i = end - 1;
    } else if (c === "(") {
      depth++;
      out.push(depth > 0 ? " " : c);
    } else if (c === ")") {
      depth = Math.max(0, depth - 1);
      out.push(" ");
    } else out.push(depth > 0 ? " " : c);
  }
  return out.join("");
}

function lastTop(sql: string, re: RegExp): { index: number; length: number } | null {
  const m = maskSql(sql);
  let found: { index: number; length: number } | null = null;
  const g = new RegExp(re.source, "gi");
  let x: RegExpExecArray | null;
  while ((x = g.exec(m))) {
    found = { index: x.index, length: x[0].length };
    if (x[0].length === 0) g.lastIndex++;
  }
  return found;
}

export interface KeyCol {
  expr: string;
  dir: "ASC" | "DESC";
}

export function parseKeys(text: string): KeyCol[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  parts.push(cur);
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const m = /^(.*?)\s+(ASC|DESC)(?:\s+NULLS\s+(?:FIRST|LAST))?$/i.exec(p);
      return m ? { expr: m[1]!.trim(), dir: m[2]!.toUpperCase() as "ASC" | "DESC" } : { expr: p.replace(/\s+NULLS\s+(FIRST|LAST)$/i, ""), dir: "ASC" };
    });
}

/** Column as it is visible once the query is wrapped as a subquery: drop a table qualifier. */
function outerName(expr: string): string {
  const m = /^(?:[A-Za-z_][\w$#]*|"[^"]+"|`[^`]+`|\[[^\]]+\])\.(.+)$/.exec(expr);
  return m && /^[\w$#"`[\]]+$/.test(m[1]!) ? m[1]! : expr;
}

const qLit = (v: string) => (/^-?\d+(\.\d+)?$/.test(v) ? v : `'${v.replace(/'/g, "''")}'`);

interface Param {
  name: string;
  value: string;
}

class Binder {
  list: Param[] = [];
  order: string[] = [];
  constructor(private style: Opts["params"]) {}
  ref(name: string, value: string): string {
    if (!this.list.some((p) => p.name === name)) this.list.push({ name, value });
    switch (this.style) {
      case "literal":
        return qLit(value);
      case "named":
        return ":" + name;
      case "at":
        return "@" + name;
      case "dollar": {
        let i = this.order.indexOf(name);
        if (i < 0) i = this.order.push(name) - 1;
        return "$" + (i + 1);
      }
      default:
        this.order.push(name);
        return "?";
    }
  }
}

const ROW_VALUE: Dialect[] = ["postgresql", "mysql", "sqlite"];

export function keysetCondition(keys: KeyCol[], values: string[], dialect: Dialect, b: Binder): string {
  const names = keys.map((k, i) => `k${i + 1}`);
  const same = keys.every((k) => k.dir === keys[0]!.dir);
  if (same && keys.length > 1 && ROW_VALUE.includes(dialect)) {
    const op = keys[0]!.dir === "ASC" ? ">" : "<";
    return `(${keys.map((k) => outerName(k.expr)).join(", ")}) ${op} (${names.map((n, i) => b.ref(n, values[i] ?? "")).join(", ")})`;
  }
  const ors: string[] = [];
  for (let i = 0; i < keys.length; i++) {
    const ands: string[] = [];
    for (let j = 0; j < i; j++) ands.push(`${outerName(keys[j]!.expr)} = ${b.ref(names[j]!, values[j] ?? "")}`);
    ands.push(`${outerName(keys[i]!.expr)} ${keys[i]!.dir === "ASC" ? ">" : "<"} ${b.ref(names[i]!, values[i] ?? "")}`);
    ors.push(ands.length > 1 ? `(${ands.join(" AND ")})` : ands[0]!);
  }
  return ors.length > 1 ? `(${ors.join("\n     OR ")})` : ors[0]!;
}

const orderText = (keys: KeyCol[]) => keys.map((k) => `${outerName(k.expr)} ${k.dir}`).join(", ");

function splitValues(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === "'") {
      if (q && s[i + 1] === "'") {
        cur += "'";
        i++;
      } else q = !q;
    } else if (c === "," && !q) {
      out.push(cur.trim());
      cur = "";
    } else cur += c;
  }
  out.push(cur.trim());
  return out.filter((x, i, a) => x !== "" || a.length > 1);
}

export function paginate(sqlIn: string, o: Opts): { sql: string[]; notes: string[]; params: Param[]; order: string[] } {
  const notes: string[] = [];
  const sql = sqlIn.trim().replace(/;+\s*$/, "").trim();
  if (!/^(with|select|\()/i.test(sql)) throw new Error("Expected a SELECT (or WITH ... SELECT) statement");
  if (lastTop(sql, /\b(LIMIT|OFFSET|FETCH\s+(FIRST|NEXT)|TOP\s+\d+)\b/) || /^\s*select\s+(distinct\s+)?top\b/i.test(sql))
    throw new Error("The query already has LIMIT / OFFSET / FETCH / TOP: remove it and let this tool add paging");
  if (lastTop(sql, /\bFOR\s+(UPDATE|SHARE)\b/)) notes.push("FOR UPDATE can't sit inside a paging wrapper; lock rows in a separate statement or with a keyset query on the base table.");

  // pull a top-level ORDER BY off the end
  let orderKeys: KeyCol[] = [];
  const ob = lastTop(sql, /\bORDER\s+BY\b/);
  let base = sql;
  if (ob) {
    orderKeys = parseKeys(sql.slice(ob.index + ob.length));
    base = sql.slice(0, ob.index).trim();
  }
  if (orderKeys.length === 0 && o.orderBy.trim()) orderKeys = parseKeys(o.orderBy.replace(/^order\s+by\s+/i, ""));
  const explicitKeys = o.keyColumns.trim() ? parseKeys(o.keyColumns.replace(/^order\s+by\s+/i, "")) : [];
  const keys = explicitKeys.length ? explicitKeys : orderKeys;

  const b = new Binder(o.params);
  const inner = base; // statement without ORDER BY
  const orderClause = orderKeys.length ? `ORDER BY ${orderKeys.map((k) => `${k.expr} ${k.dir}`).join(", ")}` : "";
  const out: string[] = [];
  const one = (n: number) => (o.lookahead ? n + 1 : n);

  if (o.mode !== "keyset") {
    if (!orderKeys.length) {
      if (o.dialect === "sqlserver") notes.push("SQL Server needs an ORDER BY for OFFSET/FETCH; used ORDER BY (SELECT NULL), which gives no stable order. Add a real ORDER BY.");
      else notes.push("No ORDER BY: pages are not stable. Add a unique ORDER BY (the options have an 'ORDER BY if missing' field).");
    }
    const size = o.mode === "page" ? o.pageSize : o.limit;
    const off = o.mode === "page" ? (o.page - 1) * o.pageSize : o.offset;
    const lim = one(size);
    const ord = orderClause || (o.dialect === "sqlserver" ? "ORDER BY (SELECT NULL)" : "");
    const base1 = `${inner}${ord ? "\n" + ord : ""}`;
    switch (o.dialect) {
      case "postgresql":
      case "sqlite":
      case "mysql":
        out.push(`${base1}\nLIMIT ${b.ref("limit", String(lim))}${off > 0 || o.params !== "literal" ? ` OFFSET ${b.ref("offset", String(off))}` : ""}`);
        break;
      case "oracle":
      case "sqlserver":
        out.push(`${base1}\nOFFSET ${b.ref("offset", String(off))} ROWS FETCH NEXT ${b.ref("limit", String(lim))} ROWS ONLY`);
        break;
      case "db2":
        out.push(`${base1}\nOFFSET ${b.ref("offset", String(off))} ROWS FETCH FIRST ${b.ref("limit", String(lim))} ROWS ONLY`);
        notes.push("DB2 OFFSET needs Db2 LUW 11.1+ (or MODE_DB2/compat). Older versions: use ROW_NUMBER() OVER (...).");
        break;
      case "oracle11": {
        const lo = b.ref("lo", String(off));
        const hi = b.ref("hi", String(off + lim));
        out.push(`SELECT * FROM (\n  SELECT a.*, ROWNUM rn FROM (\n${base1.replace(/^/gm, "    ")}\n  ) a\n  WHERE ROWNUM <= ${hi}\n)\nWHERE rn > ${lo}`);
        notes.push("Oracle 11g form: the inner ROWNUM filter must be applied before the outer rn filter. Result includes an extra rn column.");
        break;
      }
    }
    if (o.mode === "offset" || o.mode === "page") notes.push("OFFSET cost grows with depth (the database still reads and discards the skipped rows). For deep or live-updating lists use keyset mode.");
  } else {
    if (keys.length === 0) throw new Error("Keyset mode needs key columns (or an ORDER BY in the query)");
    notes.push("Keys must be unique together and NOT NULL, and be output columns of the query. End with a unique column (usually the primary key).");
    const values = splitValues(o.after);
    if (o.after.trim() && values.length !== keys.length) throw new Error(`Expected ${keys.length} value(s) after= (one per key column), got ${values.length}`);
    const lim = one(o.pageSize);
    const mk = (withCond: boolean, binder: Binder): string => {
      const cond = withCond ? keysetCondition(keys, values, o.dialect, binder) : "";
      const where = cond ? `\nWHERE ${cond}` : "";
      const ord = `ORDER BY ${orderText(keys)}`;
      const src = `(\n${inner.replace(/^/gm, "  ")}\n) t`;
      const srcO = src;
      switch (o.dialect) {
        case "sqlserver":
          return `SELECT TOP (${binder.ref("limit", String(lim))}) * FROM ${srcO}${where}\n${ord}`;
        case "oracle":
          return `SELECT * FROM ${srcO}${where}\n${ord}\nFETCH FIRST ${binder.ref("limit", String(lim))} ROWS ONLY`;
        case "oracle11":
          return `SELECT * FROM (\n  SELECT * FROM ${srcO.replace(/^/gm, "  ").trimStart()}${where.replace(/^(?=.)/gm, "  ")}\n  ${ord}\n)\nWHERE ROWNUM <= ${binder.ref("limit", String(lim))}`;
        case "db2":
          return `SELECT * FROM ${srcO}${where}\n${ord}\nFETCH FIRST ${binder.ref("limit", String(lim))} ROWS ONLY`;
        default:
          return `SELECT * FROM ${srcO}${where}\n${ord}\nLIMIT ${binder.ref("limit", String(lim))}`;
      }
    };
    if (!o.after.trim() && o.params !== "literal") {
      out.push("-- first page\n" + mk(false, new Binder(o.params)));
      const b1 = new Binder(o.params);
      out.push("-- next pages (bind the last row's key values)\n" + mk(true, b1));
      if (o.countQuery) out.push(`-- total rows\nSELECT COUNT(*) FROM (\n${inner.replace(/^/gm, "  ")}\n) c`);
      return { sql: out, notes, params: b1.list, order: b1.order };
    }
    out.push(mk(values.length > 0, b));
    notes.push("Next cursor = the key column values of the last row returned" + (o.lookahead ? " (ignore the extra look-ahead row)." : "."));
  }

  if (o.lookahead) notes.push(`Look-ahead: the query fetches one extra row; if you get more than ${o.mode === "offset" ? o.limit : o.pageSize} rows there is a next page.`);
  if (o.countQuery) out.push(`-- total rows\nSELECT COUNT(*) FROM (\n${inner.replace(/^/gm, "  ")}\n) c`);
  return { sql: out, notes, params: b.list, order: b.order };
}

export function sqlPaginationGenerator(input: string, options: Partial<Opts> = {}): TransformResult {
  const o: Opts = {
    dialect: options.dialect ?? "postgresql",
    mode: options.mode ?? "page",
    page: options.page ?? 1,
    pageSize: options.pageSize ?? 20,
    offset: options.offset ?? 0,
    limit: options.limit ?? 20,
    keyColumns: options.keyColumns ?? "",
    after: options.after ?? "",
    params: options.params ?? "literal",
    orderBy: options.orderBy ?? "",
    lookahead: options.lookahead ?? false,
    countQuery: options.countQuery ?? false,
  };
  if (input.trim() === "") return { output: "", error: null };
  try {
    const r = paginate(input, o);
    const withSemi = r.sql.map((s) => (/;\s*$/.test(s) ? s : s + ";"));
    let out = withSemi.join("\n\n");
    if (o.params !== "literal" && r.params.length) {
      const names = o.params === "question" ? r.order : r.params.map((p) => p.name);
      const val = (n: string) => r.params.find((p) => p.name === n)?.value ?? "";
      out += "\n\n-- bind: " + (o.params === "question" ? names.map((n, i) => `#${i + 1} ${n}=${val(n)}`).join(", ") : o.params === "dollar" ? r.order.map((n, i) => `$${i + 1} ${n}=${val(n)}`).join(", ") : names.map((n) => `${n}=${val(n)}`).join(", "));
    }
    if (r.notes.length) out += "\n\n" + r.notes.map((n) => `-- NOTE: ${n}`).join("\n");
    return { output: out, error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
