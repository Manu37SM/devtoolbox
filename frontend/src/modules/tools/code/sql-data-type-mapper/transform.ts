import type { TransformResult } from "@/lib/tool-transform";
import type { SqlDataTypeMapperOptions } from "./schema";
import { langTypes, render } from "./render";
import { ct, parseType, type CType, type Dialect } from "./types";

type Opts = SqlDataTypeMapperOptions;

const NAMES: Record<Dialect, string> = { oracle: "Oracle", postgresql: "PostgreSQL", mysql: "MySQL", sqlserver: "SQL Server", sqlite: "SQLite", db2: "Db2" };
const ALL: Dialect[] = ["postgresql", "mysql", "sqlserver", "oracle", "sqlite", "db2"];

const RESERVED = new Set(
  "user order group table select from where index key comment level number size date timestamp type value values limit offset row rows desc asc check default primary references session start uid public mode file option audit end exists in is like not null or and as by case cast column constraint create current database delete distinct drop else false for foreign grant having insert into join left right on outer union unique update using view when with identity rank role name".split(" "),
);

export function detectDialect(sql: string): Dialect {
  if (/`|\bENGINE\s*=|\bAUTO_INCREMENT\b|\bunsigned\b/i.test(sql)) return "mysql";
  if (/\[\w+\]|\bIDENTITY\s*\(|\bnvarchar\b|\bdatetime2\b|\buniqueidentifier\b|\bGO\b/i.test(sql)) return "sqlserver";
  if (/\bVARCHAR2\b|\bNUMBER\b|\bCLOB\b|\bRAW\s*\(|\bSYSDATE\b|\bTABLESPACE\b|\bNVARCHAR2\b/i.test(sql)) return "oracle";
  if (/\bFOR BIT DATA\b|\bDECFLOAT\b|\bGRAPHIC\b/i.test(sql)) return "db2";
  if (/\bAUTOINCREMENT\b/i.test(sql)) return "sqlite";
  return "postgresql";
}

// ---------- tokenising helpers ----------
function splitTop(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  let q: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (q) {
      cur += c;
      if (c === q) {
        if (s[i + 1] === q) cur += s[++i]!;
        else q = null;
      }
      continue;
    }
    if (c === "'" || c === '"' || c === "`") q = c;
    else if (c === "[" && /[A-Za-z_]/.test(s[i + 1] ?? "")) {
      const j = s.indexOf("]", i);
      if (j > 0) {
        cur += s.slice(i, j + 1);
        i = j;
        continue;
      }
    } else if (c === "-" && s[i + 1] === "-") {
      while (i < s.length && s[i] !== "\n") i++;
      continue;
    } else if (c === "/" && s[i + 1] === "*") {
      const j = s.indexOf("*/", i + 2);
      i = j < 0 ? s.length : j + 1;
      continue;
    } else if (c === "(") depth++;
    else if (c === ")") depth--;
    if (c === sep && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function tokens(s: string): string[] {
  const t: string[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i]!;
    if (/\s/.test(c)) {
      i++;
    } else if (c === "'" || c === '"' || c === "`") {
      let j = i + 1;
      while (j < s.length && !(s[j] === c && s[j + 1] !== c)) j += s[j] === c ? 2 : 1;
      t.push(s.slice(i, j + 1));
      i = j + 1;
    } else if (c === "[" && /[A-Za-z_ ]/.test(s[i + 1] ?? "")) {
      const j = s.indexOf("]", i);
      t.push(s.slice(i, j + 1));
      i = j + 1;
    } else if (c === "(") {
      let d = 0;
      let j = i;
      let q: string | null = null;
      for (; j < s.length; j++) {
        const x = s[j]!;
        if (q) {
          if (x === q) q = null;
        } else if (x === "'" || x === '"') q = x;
        else if (x === "(") d++;
        else if (x === ")" && --d === 0) break;
      }
      t.push(s.slice(i, j + 1));
      i = j + 1;
    } else {
      let j = i;
      while (j < s.length && !/[\s(]/.test(s[j]!) && !(s[j] === "," )) j++;
      if (j === i) j++;
      t.push(s.slice(i, j));
      i = j;
    }
  }
  return t;
}

// ---------- identifiers ----------
interface Ident {
  name: string;
  quoted: boolean;
}

function parseIdent(raw: string): Ident {
  const r = raw.trim();
  if (r.startsWith('"') && r.endsWith('"')) return { name: r.slice(1, -1).replace(/""/g, '"'), quoted: true };
  if (r.startsWith("`") && r.endsWith("`")) return { name: r.slice(1, -1).replace(/``/g, "`"), quoted: true };
  if (r.startsWith("[") && r.endsWith("]")) return { name: r.slice(1, -1), quoted: true };
  return { name: r, quoted: false };
}

function parseQName(raw: string): Ident[] {
  return splitTop(raw.replace(/\s*\.\s*/g, "."), ".").map(parseIdent);
}

class Namer {
  constructor(private to: Dialect, private o: Opts) {}
  one(i: Ident): string {
    let n = i.name;
    let quoted = i.quoted;
    if (this.o.identifiers === "lower") {
      n = n.toLowerCase();
      quoted = false;
    } else if (this.o.identifiers === "upper") {
      n = n.toUpperCase();
      quoted = false;
    }
    const simple = /^[A-Za-z_][A-Za-z0-9_$#]*$/.test(n);
    // a quoted name only needs quotes in the target when the target would fold its case differently
    const folds = this.to === "postgresql" ? n !== n.toLowerCase() : this.to === "oracle" || this.to === "db2" ? n !== n.toUpperCase() : false;
    const need = this.o.quoteAll || !simple || RESERVED.has(n.toLowerCase()) || (quoted && folds);
    if (!need) return n;
    switch (this.to) {
      case "mysql": return "`" + n.replace(/`/g, "``") + "`";
      case "sqlserver": return "[" + n.replace(/]/g, "]]") + "]";
      default: return '"' + n.replace(/"/g, '""') + '"';
    }
  }
  q(parts: Ident[]): string {
    return parts.map((p) => this.one(p)).join(".");
  }
  list(raw: string): string {
    return splitTop(raw, ",").map((c) => {
      const m = /^\s*(.*?)(\s+(?:ASC|DESC))?\s*$/is.exec(c)!;
      return this.one(parseIdent(m[1]!)) + (m[2] ? m[2].toUpperCase() : "");
    }).join(", ");
  }
}

// ---------- defaults ----------
function mapDefault(expr: string, t: CType, from: Dialect, to: Dialect, o: Opts, notes: string[]): string | null {
  let e = expr.trim();
  while (/^\(.*\)$/s.test(e) && balanced(e.slice(1, -1))) e = e.slice(1, -1).trim();
  e = e.replace(/::[\w\s."]+(\([^)]*\))?(\[\])?$/g, "").trim();
  e = e.replace(/^N'/i, "'");
  const l = e.toLowerCase();
  if (l === "null") return "NULL";
  if (t.k === "bool" && /^(true|false|1|0|'t'|'f'|'y'|'n'|'1'|'0'|b'1'|b'0'|'true'|'false')$/.test(l)) {
    const v = /^(true|1|'t'|'y'|'1'|b'1'|'true')$/.test(l);
    if (to === "postgresql" || to === "db2" || (to === "oracle" && o.oracleBoolean)) return v ? "TRUE" : "FALSE";
    return v ? "1" : "0";
  }
  if (/^(sysdate|systimestamp|current_timestamp(\(\d*\))?|now\(\)|getdate\(\)|sysdatetime\(\)|sysutcdatetime\(\)|localtimestamp(\(\d*\))?|current timestamp|getutcdate\(\))$/.test(l)) {
    if (/utc/.test(l)) notes.push("UTC-based default replaced by local current timestamp; review the time zone");
    if (t.k === "date") return to === "sqlserver" ? "CAST(GETDATE() AS date)" : to === "db2" ? "CURRENT DATE" : "CURRENT_DATE";
    return to === "sqlserver" ? "SYSDATETIME()" : to === "db2" ? "CURRENT TIMESTAMP" : "CURRENT_TIMESTAMP";
  }
  if (/^(current_date|curdate\(\)|current date)$/.test(l)) return to === "db2" ? "CURRENT DATE" : to === "sqlserver" ? "CAST(GETDATE() AS date)" : "CURRENT_DATE";
  if (/^(sys_guid\(\)|gen_random_uuid\(\)|uuid_generate_v4\(\)|newid\(\)|newsequentialid\(\)|uuid\(\))$/.test(l)) {
    switch (to) {
      case "postgresql": return "gen_random_uuid()";
      case "mysql": return "(UUID())";
      case "sqlserver": return "NEWID()";
      case "oracle": return "SYS_GUID()";
      case "sqlite": return "(lower(hex(randomblob(16))))";
      default: notes.push("no built-in UUID default in Db2; generate in the application"); return null;
    }
  }
  if (/^-?\d+(\.\d+)?$/.test(e) || /^'(?:[^']|'')*'$/.test(e)) return e;
  if (/^nextval\(|^next value for|\.nextval$/i.test(e)) {
    notes.push(`sequence default "${e}" copied; create the sequence in the target or use an identity column`);
    return e;
  }
  notes.push(`default expression ${e} copied unchanged; check it exists in ${NAMES[to]}`);
  void from;
  return e;
}

function balanced(s: string): boolean {
  let d = 0;
  let q = false;
  for (const c of s) {
    if (c === "'") q = !q;
    if (q) continue;
    if (c === "(") d++;
    if (c === ")" && --d < 0) return false;
  }
  return d === 0;
}

// ---------- DDL model ----------
interface Col {
  name: Ident;
  rawType: string;
  type: CType;
  notNull: boolean;
  nullExplicit: boolean;
  def?: string;
  identity: boolean;
  pk: boolean;
  unique: boolean;
  checks: string[];
  refs?: string;
  cname?: string;
  notes: string[];
}

const STOP = new Set(["not", "null", "default", "primary", "unique", "references", "check", "constraint", "generated", "auto_increment", "autoincrement", "identity", "collate", "comment", "on", "enable", "disable", "using", "visible", "invisible", "as", "storage", "encrypt", "with"]);

function parseColumn(item: string, from: Dialect, o: Opts): Col {
  const t = tokens(item);
  const name = parseIdent(t[0]!);
  const typeToks: string[] = [];
  let i = 1;
  for (; i < t.length; i++) {
    const w = t[i]!.toLowerCase();
    if (w === "with" && /^(local|time)$/.test((t[i + 1] ?? "").toLowerCase())) { typeToks.push(t[i]!); continue; }
    if (w === "with" && /^(without)$/.test((t[i + 1] ?? "").toLowerCase())) { typeToks.push(t[i]!); continue; }
    if (w === "character" && (t[i + 1] ?? "").toLowerCase() === "set") break;
    if (w === "charset") break;
    if (w === "on" && (typeToks.at(-1) ?? "").toLowerCase() !== "") { /* ON UPDATE / ON NULL: option */ }
    if (STOP.has(w) && !(w === "identity" && typeToks.length === 0)) {
      if (w === "generated" || w === "as" || w === "on" || STOP.has(w)) break;
    }
    typeToks.push(t[i]!);
  }
  const rawType = typeToks.join(" ");
  const col: Col = { name, rawType, type: parseType(from, rawType, { integers: o.integers, numberOneAsBoolean: o.numberOneAsBoolean }), notNull: false, nullExplicit: false, identity: false, pk: false, unique: false, checks: [], notes: [] };
  if (/^(serial|bigserial|smallserial)$/i.test(rawType)) col.identity = true;
  for (; i < t.length; i++) {
    const w = t[i]!.toLowerCase();
    const n = (t[i + 1] ?? "").toLowerCase();
    if (w === "constraint") { col.cname = t[++i]; continue; }
    if (w === "not" && n === "null") { col.notNull = true; col.nullExplicit = true; i++; continue; }
    if (w === "null") { col.nullExplicit = true; continue; }
    if (w === "primary" && n === "key") { col.pk = true; i++; continue; }
    if (w === "unique") { col.unique = true; if (n === "key") i++; continue; }
    if (w === "auto_increment" || w === "autoincrement") { col.identity = true; continue; }
    if (w === "identity") { col.identity = true; if ((t[i + 1] ?? "").startsWith("(")) i++; continue; }
    if (w === "generated") {
      // GENERATED { ALWAYS | BY DEFAULT [ON NULL] } AS IDENTITY [(...)]   |   GENERATED ALWAYS AS (expr) [VIRTUAL|STORED]
      let j = i + 1;
      while (j < t.length && !/^(identity|as)$/i.test(t[j]!)) j++;
      if (/^as$/i.test(t[j] ?? "") && /^identity$/i.test(t[j + 1] ?? "")) {
        col.identity = true;
        i = j + 1;
        if ((t[i + 1] ?? "").startsWith("(")) i++;
      } else {
        col.notes.push("generated (computed) column expression not converted: " + t.slice(i, i + 6).join(" "));
        i = t.length;
      }
      continue;
    }
    if (w === "as" && (t[i + 1] ?? "").startsWith("(")) { col.notes.push("computed column expression not converted: " + t.slice(i, i + 3).join(" ")); i = t.length; continue; }
    if (w === "default") {
      let j = i + 1;
      if ((t[j] ?? "").toLowerCase() === "on" && (t[j + 1] ?? "").toLowerCase() === "null") j += 2;
      let e = t[j] ?? "";
      if ((t[j + 1] ?? "").startsWith("(") && /^[\w.]+$/.test(e)) e += t[++j]!;
      else if (/^(next)$/i.test(e) && /^value$/i.test(t[j + 1] ?? "")) { e = t.slice(j, j + 4).join(" "); j += 3; }
      else if (/^[+-]$/.test(e)) e += t[++j] ?? "";
      col.def = e;
      i = j;
      continue;
    }
    if (w === "references") {
      let j = i + 1;
      const parts = [t[j++]!];
      if ((t[j] ?? "").startsWith("(")) parts.push(t[j++]!);
      while (j < t.length && /^(on|match|deferrable|not|initially)$/i.test(t[j]!)) {
        if (/^on$/i.test(t[j]!)) { parts.push(t.slice(j, j + 3).join(" ")); j += 3; if (/^(null|default|action)$/i.test(t[j] ?? "") && /^set$/i.test(parts.at(-1)!.split(" ")[2] ?? "")) j++; }
        else { parts.push(t[j]!); j++; }
      }
      col.refs = parts.join(" ");
      i = j - 1;
      continue;
    }
    if (w === "check") { col.checks.push(t[i + 1] ?? ""); i++; continue; }
    if (w === "collate") { col.notes.push(`COLLATE ${t[i + 1] ?? ""} dropped`); i++; continue; }
    if (w === "character" && n === "set") { col.notes.push(`CHARACTER SET ${t[i + 2] ?? ""} dropped`); i += 2; continue; }
    if (w === "charset") { col.notes.push(`CHARSET ${t[i + 1] ?? ""} dropped`); i++; continue; }
    if (w === "comment") { col.notes.push(`COMMENT ${t[i + 1] ?? ""} dropped (use COMMENT ON COLUMN / extended properties)`); i++; continue; }
    if (w === "on" && n === "update") { col.notes.push(`ON UPDATE ${t[i + 2] ?? ""} dropped; use a trigger`); i += 2; continue; }
    if (w === "enable" || w === "disable" || w === "visible" || w === "invisible" || w === "validate" || w === "novalidate") continue;
    if (w === "using" && n === "index") { i += 1; while ((t[i + 1] ?? "") && !/^(not|null|default|primary|unique|references|check|constraint)$/i.test(t[i + 1]!)) i++; continue; }
    if (w === "with" || w === "storage" || w === "encrypt") { col.notes.push(`${t[i]} clause dropped`); continue; }
    col.notes.push(`unrecognised "${t[i]}" skipped`);
  }
  if (col.def !== undefined && /^\(*\s*(sys_guid\(\)|newid\(\)|gen_random_uuid\(\)|uuid_generate_v4\(\))/i.test(col.def) && (col.type.k === "bin" || col.type.k === "varbin") && col.type.len === 16) {
    col.type = ct("uuid", { notes: ["16-byte binary with a GUID default treated as uuid"] });
  }
  if (col.identity && col.type.unsigned && col.type.k === "i8") {
    col.notes.push("unsigned identity column mapped to a signed type (range halves)");
    col.type = { ...col.type, unsigned: false };
  }
  return col;
}

interface TableDef {
  name: Ident[];
  ifNotExists: boolean;
  temp: boolean;
  cols: Col[];
  constraints: string[];
  tail: string;
}

function parseCreateTable(stmt: string, from: Dialect, o: Opts): TableDef | null {
  const m = /^create\s+(global\s+temporary\s+|temporary\s+|temp\s+|unlogged\s+)?table\s+(if\s+not\s+exists\s+)?((?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[\w$#]+)(?:\s*\.\s*(?:"[^"]+"|`[^`]+`|\[[^\]]+\]|[\w$#]+))*)\s*\(/is.exec(stmt);
  if (!m) return null;
  const start = m[0].length;
  let depth = 1;
  let q: string | null = null;
  let end = start;
  for (; end < stmt.length; end++) {
    const c = stmt[end]!;
    if (q) { if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === "`") q = c;
    else if (c === "(") depth++;
    else if (c === ")" && --depth === 0) break;
  }
  const body = stmt.slice(start, end);
  const items = splitTop(body, ",").map((s) => s.trim()).filter(Boolean);
  const cols: Col[] = [];
  const constraints: string[] = [];
  for (const it of items) {
    if (/^(constraint\s+\S+\s+)?(primary\s+key|foreign\s+key|unique|check)\b/i.test(it) || /^(key|index|fulltext|spatial)\b/i.test(it)) constraints.push(it);
    else cols.push(parseColumn(it, from, o));
  }
  return { name: parseQName(m[3]!), ifNotExists: !!m[2], temp: !!m[1], cols, constraints, tail: stmt.slice(end + 1).trim() };
}

function convertConstraint(c: string, tbl: string, to: Dialect, nm: Namer, extra: string[], notes: string[]): string | null {
  const id = "((?:\"[^\"]+\"|`[^`]+`|\\[[^\\]]+\\]|[\\w$#]+))";
  let m = new RegExp(`^(?:constraint\\s+${id}\\s+)?primary\\s+key\\s*(?:clustered\\s+|nonclustered\\s+)?\\(([^)]*)\\)`, "i").exec(c);
  if (m) return `${m[1] ? "CONSTRAINT " + nm.one(parseIdent(m[1])) + " " : ""}PRIMARY KEY (${nm.list(m[2]!)})`;
  m = new RegExp(`^(?:constraint\\s+${id}\\s+)?unique(?:\\s+(?:key|index))?\\s*(?:${id}\\s*)?\\(([^)]*)\\)`, "i").exec(c);
  if (m) {
    const name = m[1] ?? m[2];
    return `${name ? "CONSTRAINT " + nm.one(parseIdent(name)) + " " : ""}UNIQUE (${nm.list(m[3]!)})`;
  }
  m = new RegExp(`^(?:constraint\\s+${id}\\s+)?foreign\\s+key\\s*(?:${id}\\s*)?\\(([^)]*)\\)\\s*references\\s+((?:"[^"]+"|\`[^\`]+\`|\\[[^\\]]+\\]|[\\w$#]+)(?:\\s*\\.\\s*(?:"[^"]+"|\`[^\`]+\`|\\[[^\\]]+\\]|[\\w$#]+))*)\\s*(?:\\(([^)]*)\\))?(.*)$`, "is").exec(c);
  if (m) {
    const name = m[1] ?? m[2];
    return `${name ? "CONSTRAINT " + nm.one(parseIdent(name)) + " " : ""}FOREIGN KEY (${nm.list(m[3]!)}) REFERENCES ${nm.q(parseQName(m[4]!))}${m[5] ? " (" + nm.list(m[5]) + ")" : ""}${fkTail(m[6] ?? "", to, notes)}`;
  }
  m = new RegExp(`^(?:constraint\\s+${id}\\s+)?(check\\s*\\(.*\\))`, "is").exec(c);
  if (m) {
    notes.push(`CHECK expression copied unchanged: ${m[2]!.replace(/\s+/g, " ")}`);
    return `${m[1] ? "CONSTRAINT " + nm.one(parseIdent(m[1])) + " " : ""}${m[2]}`;
  }
  m = new RegExp(`^(?:key|index)\\s+(?:${id}\\s*)?\\(([^)]*)\\)`, "i").exec(c);
  if (m) {
    const iname = m[1] ? nm.one(parseIdent(m[1])) : `idx_${tbl.replace(/\W/g, "")}_${m[2]!.replace(/\W+/g, "_")}`;
    extra.push(`CREATE INDEX ${iname} ON ${tbl} (${nm.list(m[2]!)});`);
    return null;
  }
  notes.push(`table clause not converted: ${c.replace(/\s+/g, " ").slice(0, 80)}`);
  return null;
}

function fkTail(tail: string, to: Dialect, notes: string[]): string {
  const keep: string[] = [];
  const re = /on\s+(delete|update)\s+(cascade|set\s+null|set\s+default|restrict|no\s+action)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tail))) {
    const ev = m[1]!.toUpperCase();
    const act = m[2]!.toUpperCase().replace(/\s+/g, " ");
    if (to === "oracle" && (ev === "UPDATE" || !/^(CASCADE|SET NULL)$/.test(act))) { notes.push(`ON ${ev} ${act} is not supported by Oracle foreign keys; dropped`); continue; }
    if (to === "db2" && ev === "UPDATE" && act !== "NO ACTION" && act !== "RESTRICT") { notes.push(`ON UPDATE ${act} is not supported by Db2; dropped`); continue; }
    if (to === "sqlserver" && /RESTRICT/.test(act)) { keep.push(`ON ${ev} NO ACTION`); continue; }
    keep.push(`ON ${ev} ${act}`);
  }
  return keep.length ? " " + keep.join(" ") : "";
}

function refClause(ref: string, nm: Namer, to: Dialect, notes: string[]): string {
  const t = tokens(ref);
  const name = nm.q(parseQName(t[0]!));
  const cols = (t[1] ?? "").startsWith("(") ? ` (${nm.list(t[1]!.slice(1, -1))})` : "";
  return `REFERENCES ${name}${cols}${fkTail(t.join(" "), to, notes)}`;
}

function buildTable(td: TableDef, from: Dialect, to: Dialect, o: Opts): string {
  const nm = new Namer(to, o);
  const tname = nm.q(td.name);
  const lines: string[] = [];
  const notes: string[] = [];
  const extra: string[] = [];
  const pkCols = new Set<string>();
  for (const c of td.constraints) {
    const m = /primary\s+key\s*(?:clustered\s+|nonclustered\s+)?\(([^)]*)\)/i.exec(c);
    if (m) for (const x of splitTop(m[1]!, ",")) pkCols.add(parseIdent(x.replace(/\s+(asc|desc)$/i, "")).name.toLowerCase());
  }
  const inlinePk = td.cols.filter((c) => c.pk);
  for (const c of td.cols) {
    const r = render(to, c.type, { unicode: o.unicode, jsonb: o.jsonb, oracleBoolean: o.oracleBoolean });
    const cn: string[] = [...c.notes, ...r.notes];
    let type = r.type;
    const isPk = c.pk || pkCols.has(c.name.name.toLowerCase());
    const parts: string[] = [nm.one(c.name)];
    if (c.identity) {
      if (to === "sqlite") {
        type = "INTEGER";
        parts.push(type);
        if (isPk && inlinePk.length + (pkCols.size ? 1 : 0) <= 1 && pkCols.size <= 1) parts.push("PRIMARY KEY AUTOINCREMENT");
        else cn.push("AUTOINCREMENT only works on a single INTEGER PRIMARY KEY column");
      } else if (to === "mysql") {
        parts.push(type, "AUTO_INCREMENT");
      } else if (to === "sqlserver") {
        parts.push(type, "IDENTITY(1,1)");
      } else {
        parts.push(type, "GENERATED BY DEFAULT AS IDENTITY");
      }
    } else parts.push(type);
    if (c.def !== undefined && !c.identity) {
      const d = mapDefault(c.def, c.type, from, to, o, cn);
      if (d !== null) parts.push("DEFAULT " + d);
    }
    if (c.notNull || (isPk && to !== "sqlite")) parts.push("NOT NULL");
    else if (to === "sqlserver" || to === "db2" ? false : false) parts.push("NULL");
    if (c.pk && !(to === "sqlite" && c.identity)) {
      if (inlinePk.length === 1 && pkCols.size === 0) parts.push(`${c.cname ? "CONSTRAINT " + nm.one(parseIdent(c.cname)) + " " : ""}PRIMARY KEY`);
      else cn.push("column-level PRIMARY KEY merged into a table constraint");
    }
    if (c.unique) parts.push("UNIQUE");
    for (const ck of c.checks) {
      parts.push(`CHECK ${ck}`);
      cn.push(`CHECK expression copied unchanged: ${ck}`);
    }
    if (c.refs) parts.push(refClause(c.refs, nm, to, cn));
    if (from === "oracle" && c.type.k === "varchar" && c.notNull && to !== "oracle") cn.push("Oracle treats '' as NULL; here an empty string satisfies NOT NULL");
    lines.push("  " + parts.join(" "));
    if (cn.length && o.notesAsComments) notes.push(...cn.map((x) => `${c.name.name}: ${x}`));
  }
  // composite primary key from several inline PKs
  if (inlinePk.length > 1 && pkCols.size === 0) lines.push(`  PRIMARY KEY (${inlinePk.map((c) => nm.one(c.name)).join(", ")})`);
  for (const c of td.constraints) {
    const k = convertConstraint(c, tname, to, nm, extra, notes);
    if (k) lines.push("  " + k);
  }
  const head = `CREATE ${td.temp ? (to === "oracle" ? "GLOBAL TEMPORARY " : to === "sqlserver" ? "" : "TEMPORARY ") : ""}TABLE ${td.ifNotExists && (to === "postgresql" || to === "mysql" || to === "sqlite") ? "IF NOT EXISTS " : ""}${to === "sqlserver" && td.temp ? nm.one({ name: "#" + td.name.at(-1)!.name, quoted: true }) : tname}`;
  let out = `${head} (\n${lines.join(",\n")}\n);`;
  if (td.temp && to === "sqlserver") notes.push("temporary table: SQL Server uses a #name table");
  if (td.tail) notes.push(`table options dropped: ${td.tail.replace(/\s+/g, " ").slice(0, 100)}`);
  if (extra.length) out += "\n" + extra.join("\n");
  if (notes.length && o.notesAsComments) out += "\n" + notes.map((n) => `-- NOTE: ${n}`).join("\n");
  return out;
}

function typesReport(td: TableDef, from: Dialect, o: Opts): string {
  const out: string[] = [`-- ${td.name.map((p) => p.name).join(".")}`];
  const w = Math.max(...td.cols.map((c) => c.name.name.length), 4);
  for (const c of td.cols) {
    const per = ALL.map((d) => `${NAMES[d]} ${render(d, c.type, { unicode: o.unicode, jsonb: o.jsonb, oracleBoolean: o.oracleBoolean }).type}`);
    const l = langTypes(c.type);
    out.push(`${c.name.name.padEnd(w)}  ${c.rawType}${c.type.notes.length || c.notes.length ? "   ← " + [...c.type.notes, ...c.notes].join("; ") : ""}`);
    out.push(`${" ".repeat(w)}  ${per.join(" · ")}`);
    out.push(`${" ".repeat(w)}  Java ${l.java} · JDBC ${l.jdbc} · TypeScript ${l.ts}`);
  }
  void from;
  return out.join("\n");
}

export function sqlDataTypeMapper(input: string, options: Partial<Opts> = {}): TransformResult {
  const o: Opts = {
    from: options.from ?? "auto",
    to: options.to ?? "postgresql",
    mode: options.mode ?? "ddl",
    integers: options.integers ?? "smart",
    numberOneAsBoolean: options.numberOneAsBoolean ?? false,
    unicode: options.unicode ?? false,
    jsonb: options.jsonb ?? true,
    oracleBoolean: options.oracleBoolean ?? false,
    identifiers: options.identifiers ?? "keep",
    quoteAll: options.quoteAll ?? false,
    notesAsComments: options.notesAsComments ?? true,
  };
  if (input.trim() === "") return { output: "", error: null };
  const from: Dialect = o.from === "auto" ? detectDialect(input) : o.from;
  try {
    const stmts = splitTop(input, ";").map((s) => s.trim()).filter(Boolean);
    const out: string[] = [];
    let tables = 0;
    for (const s of stmts) {
      const td = parseCreateTable(s.replace(/^(\s*(--[^\n]*\n|\/\*[\s\S]*?\*\/))+/, "").trim(), from, o);
      if (!td) {
        const stripped = s.replace(/^(\s*--[^\n]*\n)+/, "").trim();
        if (/^create\s+(unique\s+)?index/i.test(stripped)) out.push(`-- NOTE: index statement not converted:\n-- ${stripped.replace(/\n/g, "\n-- ")}`);
        else if (stripped) out.push(`-- skipped (not a CREATE TABLE): ${stripped.split("\n")[0]!.slice(0, 80)}`);
        continue;
      }
      tables++;
      out.push(o.mode === "types" ? typesReport(td, from, o) : buildTable(td, from, o.to, o));
    }
    if (tables === 0) return { output: "", error: { message: "No CREATE TABLE statement found" } };
    const head = o.mode === "ddl" ? `-- ${NAMES[from]} → ${NAMES[o.to]}${o.from === "auto" ? " (source dialect detected)" : ""}\n\n` : `-- source: ${NAMES[from]}${o.from === "auto" ? " (detected)" : ""}\n\n`;
    return { output: head + out.join("\n\n"), error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}

export { ct };
