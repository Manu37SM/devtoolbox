import type { TransformResult } from "@/lib/tool-transform";
import type { SqlDdlToJpaEntityOptions } from "./schema";

export interface Column {
  name: string;
  type: string;
  precision?: number;
  scale?: number;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  identity: boolean;
  references?: { table: string; column: string };
}
export interface Table { schema?: string; name: string; columns: Column[]; primaryKey: string[] }

const unq = (s: string) => s.replace(/^["`\[](.*)["`\]]$/, "$1");

function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0, cur = "", q: string | null = null;
  for (const ch of body) {
    if (q) { cur += ch; if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === "`") { q = ch; cur += ch; continue; }
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function tokens(def: string): string[] {
  return def.match(/"[^"]*"|`[^`]*`|\[[^\]]*\]|'(?:[^']|'')*'|\([^()]*(?:\([^()]*\)[^()]*)*\)|[^\s(]+/g) ?? [];
}

const STOP = new Set(["NOT", "NULL", "DEFAULT", "PRIMARY", "UNIQUE", "REFERENCES", "CHECK", "CONSTRAINT", "GENERATED", "AUTO_INCREMENT", "IDENTITY", "COLLATE", "COMMENT", "ENCRYPT", "ON", "AS", "VISIBLE", "INVISIBLE"]);
const colList = (s: string) => s.replace(/^\(|\)$/g, "").split(",").map((c) => unq(c.trim())).filter(Boolean);

export function parseDdl(sql: string): Table[] {
  const cleaned = sql.replace(/--[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const tables: Table[] = [];
  const re = /CREATE\s+(?:GLOBAL\s+TEMPORARY\s+|TEMPORARY\s+|TEMP\s+|UNLOGGED\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w."`\[\]$#]+)\s*\(/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned))) {
    let depth = 1, i = re.lastIndex;
    for (; i < cleaned.length && depth > 0; i++) { if (cleaned[i] === "(") depth++; else if (cleaned[i] === ")") depth--; }
    const body = cleaned.slice(re.lastIndex, i - 1);
    const qualified = m[1]!.split(".").map(unq);
    const t: Table = { name: qualified[qualified.length - 1]!, schema: qualified.length > 1 ? qualified[0] : undefined, columns: [], primaryKey: [] };
    const tableFks: { cols: string[]; table: string; refCols: string[] }[] = [];
    const tableUniques: string[][] = [];
    for (const part of splitTopLevel(body)) {
      const upper = part.toUpperCase();
      const constraint = /^(CONSTRAINT\s+\S+\s+)?(PRIMARY\s+KEY|UNIQUE|FOREIGN\s+KEY|CHECK|INDEX|KEY|EXCLUDE)\b/i.exec(part);
      if (constraint) {
        const kind = constraint[2]!.toUpperCase().replace(/\s+/g, " ");
        const parens = part.match(/\(([^()]*)\)/g) ?? [];
        if (kind === "PRIMARY KEY" && parens[0]) t.primaryKey = colList(parens[0]);
        else if (kind === "UNIQUE" && parens[0]) tableUniques.push(colList(parens[0]));
        else if (kind === "FOREIGN KEY" && parens[0]) {
          const ref = /REFERENCES\s+([\w."`\[\]$#]+)\s*(\([^)]*\))?/i.exec(part);
          if (ref) tableFks.push({ cols: colList(parens[0]), table: unq(ref[1]!.split(".").pop()!), refCols: ref[2] ? colList(ref[2]) : ["id"] });
        }
        continue;
      }
      if (/^(LIKE|PERIOD)\b/i.test(upper)) continue;
      const tk = tokens(part);
      if (tk.length < 2) continue;
      const col: Column = { name: unq(tk[0]!), type: "", nullable: true, primaryKey: false, unique: false, identity: false };
      let j = 1;
      const typeParts: string[] = [];
      while (j < tk.length && !STOP.has(tk[j]!.toUpperCase())) {
        const w = tk[j]!;
        if (w.startsWith("(")) {
          const nums = w.slice(1, -1).split(",").map((x) => x.trim());
          const p = parseInt(nums[0]!, 10);
          if (!Number.isNaN(p)) col.precision = p;
          if (nums[1] !== undefined && !Number.isNaN(parseInt(nums[1], 10))) col.scale = parseInt(nums[1], 10);
        } else {
          const inline = /^([A-Za-z_][\w]*)\(([^)]*)\)$/.exec(w);
          if (inline) {
            typeParts.push(inline[1]!);
            const nums = inline[2]!.split(",").map((x) => x.trim());
            const p = parseInt(nums[0]!, 10);
            if (!Number.isNaN(p)) col.precision = p;
            if (nums[1] !== undefined && !Number.isNaN(parseInt(nums[1], 10))) col.scale = parseInt(nums[1], 10);
          } else typeParts.push(w);
        }
        j++;
      }
      col.type = typeParts.join(" ").toUpperCase();
      const rest = tk.slice(j).join(" ").toUpperCase();
      if (/NOT\s+NULL/.test(rest)) col.nullable = false;
      if (/PRIMARY\s+KEY/.test(rest)) { col.primaryKey = true; col.nullable = false; }
      if (/\bUNIQUE\b/.test(rest)) col.unique = true;
      if (/GENERATED\s+(ALWAYS|BY\s+DEFAULT)(\s+ON\s+NULL)?\s+AS\s+IDENTITY|\bAUTO_INCREMENT\b|\bIDENTITY\b/.test(rest) || /^(SMALL|BIG)?SERIAL$/.test(col.type)) col.identity = true;
      const ref = /REFERENCES\s+([\w."`\[\]$#]+)\s*(\([^)]*\))?/i.exec(tk.slice(j).join(" "));
      if (ref) col.references = { table: unq(ref[1]!.split(".").pop()!), column: ref[2] ? colList(ref[2])[0]! : "id" };
      t.columns.push(col);
    }
    for (const c of t.columns) if (c.primaryKey && !t.primaryKey.includes(c.name)) t.primaryKey.push(c.name);
    for (const pk of t.primaryKey) { const c = t.columns.find((x) => x.name.toLowerCase() === pk.toLowerCase()); if (c) { c.primaryKey = true; c.nullable = false; } }
    for (const u of tableUniques) if (u.length === 1) { const c = t.columns.find((x) => x.name.toLowerCase() === u[0]!.toLowerCase()); if (c) c.unique = true; }
    for (const fk of tableFks) if (fk.cols.length === 1) { const c = t.columns.find((x) => x.name.toLowerCase() === fk.cols[0]!.toLowerCase()); if (c) c.references = { table: fk.table, column: fk.refCols[0]! }; }
    tables.push(t);
    re.lastIndex = i;
  }
  return tables;
}

export function camel(s: string): string {
  const parts = s.toLowerCase().split(/[_\s$#]+/).filter(Boolean);
  return parts.map((p, i) => (i === 0 ? p : p[0]!.toUpperCase() + p.slice(1))).join("") || "field";
}
export const pascal = (s: string) => { const c = camel(s); return c[0]!.toUpperCase() + c.slice(1); };
const singular = (s: string) => (/ies$/i.test(s) ? s.replace(/ies$/i, "y") : /(ss|us)$/i.test(s) ? s : /(xes|ches|shes|sses)$/i.test(s) ? s.replace(/es$/i, "") : s.replace(/s$/i, ""));

export interface JavaType { type: string; imports: string[]; lob?: boolean; json?: boolean; note?: string }

export function javaType(c: Column, oracle: boolean): JavaType {
  const t = c.type;
  const base = t.split(" ")[0]!;
  const p = c.precision, s = c.scale;
  const big = { type: "BigDecimal", imports: ["java.math.BigDecimal"] };
  if (/^(NUMBER|NUMERIC|DECIMAL|DEC)$/.test(base)) {
    if (s !== undefined && s > 0) return big;
    if (p === undefined) return base === "NUMBER" ? { ...big, note: "NUMBER without precision can hold decimals" } : big;
    if (p <= 9) return { type: "Integer", imports: [] };
    if (p <= 19) return { type: "Long", imports: [] };
    return { type: "BigInteger", imports: ["java.math.BigInteger"] };
  }
  if (/^(INT|INTEGER|INT4|MEDIUMINT|SERIAL|PLS_INTEGER)$/.test(base)) return { type: "Integer", imports: [] };
  if (/^(SMALLINT|INT2|SMALLSERIAL)$/.test(base)) return { type: "Short", imports: [] };
  if (base === "TINYINT") return p === 1 ? { type: "Boolean", imports: [] } : { type: "Byte", imports: [] };
  if (/^(BIGINT|INT8|BIGSERIAL)$/.test(base)) return { type: "Long", imports: [] };
  if (/^(REAL|FLOAT4|BINARY_FLOAT)$/.test(base)) return { type: "Float", imports: [] };
  if (/^(FLOAT|FLOAT8|DOUBLE|BINARY_DOUBLE)$/.test(base)) return { type: "Double", imports: [] };
  if (/^(BOOLEAN|BOOL)$/.test(base) || (base === "BIT" && (p === undefined || p === 1))) return { type: "Boolean", imports: [] };
  if (/^(CLOB|NCLOB)$/.test(base)) return { type: "String", imports: [], lob: true };
  if (/^(VARCHAR2|NVARCHAR2|VARCHAR|NVARCHAR|CHAR|NCHAR|CHARACTER|TEXT|CITEXT|TINYTEXT|MEDIUMTEXT|LONGTEXT|STRING|LONG|XMLTYPE|ENUM|SET)$/.test(base)) return { type: "String", imports: [] };
  if (/^(BLOB)$/.test(base)) return { type: "byte[]", imports: [], lob: true };
  if (/^(BYTEA|RAW|VARBINARY|BINARY|LONGBLOB|MEDIUMBLOB|TINYBLOB|IMAGE)$/.test(base)) return { type: "byte[]", imports: [], note: base === "RAW" && p === 16 ? "RAW(16) is often a UUID" : undefined };
  if (/^(UUID|UNIQUEIDENTIFIER)$/.test(base)) return { type: "UUID", imports: ["java.util.UUID"] };
  if (/^(JSON|JSONB)$/.test(base)) return { type: "String", imports: [], json: true };
  if (base === "TIMESTAMPTZ" || /TIME ZONE/.test(t) && !/WITHOUT TIME ZONE/.test(t)) return { type: "OffsetDateTime", imports: ["java.time.OffsetDateTime"] };
  if (/^(TIMESTAMP|DATETIME|DATETIME2|SMALLDATETIME)$/.test(base)) return { type: "LocalDateTime", imports: ["java.time.LocalDateTime"] };
  if (base === "DATE") return oracle ? { type: "LocalDateTime", imports: ["java.time.LocalDateTime"], note: "Oracle DATE also stores a time of day" } : { type: "LocalDate", imports: ["java.time.LocalDate"] };
  if (/^(TIME|TIMETZ)$/.test(base)) return { type: "LocalTime", imports: ["java.time.LocalTime"] };
  if (base === "INTERVAL") return { type: "Duration", imports: ["java.time.Duration"] };
  return { type: "Object", imports: [], note: `TODO: map SQL type ${t}` };
}

const isString = (j: JavaType) => j.type === "String" && !j.lob && !j.json;

export function runSqlDdlToJpaEntity(input: string, options: SqlDdlToJpaEntityOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const tables = parseDdl(input);
  if (tables.length === 0) return { output: "", error: { message: "No CREATE TABLE statement found." } };
  const oracle = /\b(VARCHAR2|NVARCHAR2|NUMBER|CLOB|BINARY_DOUBLE|SYSDATE)\b/i.test(input);
  const ns = options.target === "javax" ? "javax.persistence" : "jakarta.persistence";
  const known = new Set(tables.map((t) => t.name.toLowerCase()));
  const files: string[] = [];

  for (const t of tables) {
    const cls = pascal(singular(t.name));
    const imports = new Set<string>();
    const pkCols = t.columns.filter((c) => c.primaryKey);
    const composite = pkCols.length > 1;

    if (options.target === "record") {
      const comps = t.columns.map((c) => { const j = javaType(c, oracle); j.imports.forEach((x) => imports.add(x)); return `    ${j.type} ${camel(c.name)}`; });
      files.push(`${header(options.packageName, imports)}public record ${cls}(\n${comps.join(",\n")}\n) {\n}`);
      continue;
    }

    const field = (c: Column, inEmbeddable = false): string => {
      const j = javaType(c, oracle);
      j.imports.forEach((x) => imports.add(x));
      const ann: string[] = [];
      const name = camel(c.name);
      if (j.note) ann.push(`// ${j.note}`);
      if (!inEmbeddable && c.primaryKey && !composite) {
        ann.push("@Id");
        imports.add(`${ns}.Id`);
        const strategy = options.idStrategy === "auto" ? (c.identity ? "identity" : "none") : options.idStrategy;
        if (strategy === "identity") { ann.push("@GeneratedValue(strategy = GenerationType.IDENTITY)"); imports.add(`${ns}.GeneratedValue`); imports.add(`${ns}.GenerationType`); }
        if (strategy === "sequence") {
          const seq = `${t.name.toLowerCase()}_seq`;
          ann.push(`@GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "${seq}")`, `@SequenceGenerator(name = "${seq}", sequenceName = "${seq.toUpperCase()}", allocationSize = 1)`);
          imports.add(`${ns}.GeneratedValue`); imports.add(`${ns}.GenerationType`); imports.add(`${ns}.SequenceGenerator`);
        }
        if (strategy === "uuid") { ann.push("@GeneratedValue(strategy = GenerationType.UUID)"); imports.add(`${ns}.GeneratedValue`); imports.add(`${ns}.GenerationType`); }
      }
      if (options.relations && c.references && known.has(c.references.table.toLowerCase()) && !c.primaryKey) {
        const target = pascal(singular(c.references.table));
        imports.add(`${ns}.ManyToOne`); imports.add(`${ns}.FetchType`); imports.add(`${ns}.JoinColumn`);
        ann.push("@ManyToOne(fetch = FetchType.LAZY)", `@JoinColumn(name = "${c.name}"${c.nullable ? "" : ", nullable = false"})`);
        const prop = camel(c.name.replace(/_?id$/i, "")) || camel(c.references.table);
        return `${ann.map((a) => `    ${a}`).join("\n")}\n    private ${target} ${prop};`;
      }
      if (j.lob) { ann.push("@Lob"); imports.add(`${ns}.Lob`); }
      if (j.json) { ann.push("@JdbcTypeCode(SqlTypes.JSON)"); imports.add("org.hibernate.annotations.JdbcTypeCode"); imports.add("org.hibernate.type.SqlTypes"); }
      const attrs = [`name = "${c.name}"`];
      if (!c.nullable && !c.primaryKey) attrs.push("nullable = false");
      if (c.unique && !c.primaryKey) attrs.push("unique = true");
      if (isString(j) && c.precision !== undefined && c.precision !== 255) attrs.push(`length = ${c.precision}`);
      if (j.type === "BigDecimal" && c.precision !== undefined) { attrs.push(`precision = ${c.precision}`); if (c.scale !== undefined) attrs.push(`scale = ${c.scale}`); }
      ann.push(`@Column(${attrs.join(", ")})`);
      imports.add(`${ns}.Column`);
      if (c.references && !options.relations) ann.push(`// FK -> ${c.references.table}(${c.references.column})`);
      return `${ann.map((a) => `    ${a}`).join("\n")}\n    private ${j.type} ${name};`;
    };

    imports.add(`${ns}.Entity`); imports.add(`${ns}.Table`);
    const classAnn = ["@Entity", `@Table(name = "${t.name}"${t.schema ? `, schema = "${t.schema}"` : ""})`];
    if (options.lombok) { classAnn.push("@Getter", "@Setter", "@NoArgsConstructor"); ["lombok.Getter", "lombok.Setter", "lombok.NoArgsConstructor"].forEach((x) => imports.add(x)); }

    const body: string[] = [];
    let embeddable = "";
    if (composite) {
      const idCls = `${cls}Id`;
      imports.add(`${ns}.EmbeddedId`);
      body.push(`    @EmbeddedId\n    private ${idCls} id;`);
      const idFields = pkCols.map((c) => field(c, true));
      const eqFields = pkCols.map((c) => camel(c.name));
      embeddable = `\n\n@Embeddable\n${options.lombok ? "@Getter\n@Setter\n@NoArgsConstructor\n@EqualsAndHashCode\n" : ""}public class ${idCls} implements Serializable {\n\n${idFields.join("\n\n")}${options.lombok ? "" : `\n\n    @Override\n    public boolean equals(Object o) {\n        if (this == o) return true;\n        if (!(o instanceof ${idCls} other)) return false;\n        return ${eqFields.map((f) => `Objects.equals(${f}, other.${f})`).join(" && ")};\n    }\n\n    @Override\n    public int hashCode() {\n        return Objects.hash(${eqFields.join(", ")});\n    }`}\n}`;
      imports.add(`${ns}.Embeddable`); imports.add("java.io.Serializable");
      if (options.lombok) imports.add("lombok.EqualsAndHashCode"); else imports.add("java.util.Objects");
    }
    for (const c of t.columns) if (!(composite && c.primaryKey)) body.push(field(c));

    let accessors = "";
    if (!options.lombok) {
      const props = body.join("\n").match(/private ([\w<>\[\]]+) (\w+);/g) ?? [];
      accessors = props.map((p) => {
        const [, type, name] = /private ([\w<>\[\]]+) (\w+);/.exec(p)!;
        const cap = name![0]!.toUpperCase() + name!.slice(1);
        return `\n    public ${type} get${cap}() {\n        return ${name};\n    }\n\n    public void set${cap}(${type} ${name}) {\n        this.${name} = ${name};\n    }`;
      }).join("\n");
      body.push(`\n    protected ${cls}() {\n    }`);
    }
    files.push(`${header(options.packageName, imports)}${classAnn.join("\n")}\npublic class ${cls} {\n\n${body.join("\n\n")}${accessors ? `\n${accessors}` : ""}\n}${embeddable}`);
  }
  const lombokNote = options.lombok && options.target !== "record" ? "\n\n// Lombok: @Data/@EqualsAndHashCode on entities break with lazy relations and generated ids; @Getter/@Setter is the safe set." : "";
  return { output: files.join("\n\n// ----------------------------------------\n\n") + lombokNote, error: null };
}

function header(pkg: string, imports: Set<string>): string {
  const list = [...imports].sort((a, b) => (a.startsWith("java.") === b.startsWith("java.") ? a.localeCompare(b) : a.startsWith("java.") ? 1 : -1));
  return `${pkg.trim() ? `package ${pkg.trim()};\n\n` : ""}${list.map((i) => `import ${i};`).join("\n")}${list.length ? "\n\n" : ""}`;
}
