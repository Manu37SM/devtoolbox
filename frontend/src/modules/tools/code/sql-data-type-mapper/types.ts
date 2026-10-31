export type Dialect = "oracle" | "postgresql" | "mysql" | "sqlserver" | "sqlite" | "db2";

export type Kind =
  | "bool" | "i1" | "i2" | "i4" | "i8" | "dec" | "f4" | "f8" | "money"
  | "char" | "varchar" | "text" | "bin" | "varbin" | "blob"
  | "date" | "time" | "timetz" | "ts" | "tstz" | "interval"
  | "uuid" | "json" | "xml" | "other";

export interface CType {
  k: Kind;
  /** length for char/varchar/bin; "max" for unbounded varchar/varbin */
  len?: number | "max";
  p?: number;
  s?: number;
  /** national (Unicode) variant in the source */
  nat?: boolean;
  unsigned?: boolean;
  /** fractional-second precision for time/ts */
  fsp?: number;
  /** source type verbatim for `other` */
  raw?: string;
  notes: string[];
}

export const ct = (k: Kind, extra: Partial<CType> = {}): CType => ({ k, notes: [], ...extra });

const num = (s: string | undefined): number | undefined => (s === undefined || s === "" || s === "*" ? undefined : Number(s));

/** Parse "(a, b)" args off a type string */
function args(t: string): { base: string; a: string[]; tail: string } {
  const m = /^([^(]*)(?:\(([^)]*)\))?\s*(.*)$/s.exec(t.trim())!;
  return { base: m[1]!.trim().toLowerCase().replace(/\s+/g, " "), a: m[2] ? m[2].split(",").map((x) => x.trim()) : [], tail: (m[3] ?? "").toLowerCase().trim() };
}

export interface ParseOpts {
  integers: "smart" | "numeric";
  numberOneAsBoolean: boolean;
}

export function parseType(src: Dialect, text: string, po: ParseOpts): CType {
  const raw = text.trim();
  const parsed = args(raw);
  const a = parsed.a;
  let base = parsed.base;
  let tail = parsed.tail;
  // "timestamp with time zone" (no args): move the tz words from the base into the tail
  const tzm = /\s+(with(?:out)? (?:local )?time zone)$/.exec(base);
  if (tzm) {
    base = base.slice(0, tzm.index);
    tail = (tzm[1] + " " + tail).trim();
  }
  // "timestamp(6) with time zone": the tz words come after the args
  const full = (base + " " + tail).replace(/\s+/g, " ").trim();
  const tz = /with(?:out)? time zone/.test(full) ? !/without time zone/.test(full) : /with local time zone/.test(full);
  const unsigned = /\bunsigned\b/.test(full);
  base = base.replace(/\s+(unsigned|signed|zerofill)\b/g, "");
  const n0 = num(a[0]);
  const n1 = num(a[1]);
  const lenArg = a[0] && /^max$/i.test(a[0]) ? ("max" as const) : num(a[0]?.replace(/\s*(byte|char)\s*$/i, ""));

  // ---- common ANSI-ish names -------------------------------------------------
  switch (base) {
    case "boolean":
    case "bool":
      return ct("bool");
    case "smallint":
    case "int2":
    case "smallserial":
      return ct("i2");
    case "int":
    case "integer":
    case "int4":
    case "mediumint":
    case "serial":
      if (src === "oracle") return ct("dec", { p: 38, s: 0 });
      return ct("i4", { unsigned });
    case "bigint":
    case "int8":
    case "bigserial":
      return ct("i8", { unsigned });
    case "tinyint":
      if (src === "mysql" && n0 === 1) return ct("bool", { notes: ["tinyint(1) is MySQL's boolean; check it holds only 0/1"] });
      return ct("i1", { unsigned: unsigned || src === "sqlserver" });
    case "real":
    case "float4":
    case "binary_float":
      return ct("f4");
    case "double precision":
    case "float8":
    case "double":
    case "binary_double":
      return ct("f8");
    case "float":
      if (src === "mysql") return ct(n0 !== undefined && n0 > 24 ? "f8" : "f4");
      if (src === "oracle") return ct(n0 !== undefined && n0 <= 24 ? "f4" : "f8", { notes: n0 !== undefined && n0 > 53 ? ["Oracle FLOAT(" + n0 + ") is a binary precision; mapped to double"] : [] });
      if (src === "postgresql" || src === "sqlserver") return ct(n0 !== undefined && n0 <= 24 ? "f4" : "f8");
      return ct("f8");
    case "decimal":
    case "numeric":
    case "dec":
      return ct("dec", { p: n0, s: n1 ?? (n0 !== undefined ? 0 : undefined) });
    case "money":
    case "smallmoney":
      return ct("money");
    case "uuid":
    case "uniqueidentifier":
      return ct("uuid");
    case "json":
    case "jsonb":
      return ct("json");
    case "xml":
    case "xmltype":
      return ct("xml");
    case "date":
      if (src === "oracle") return ct("ts", { fsp: 0, notes: ["Oracle DATE stores date AND time (to the second); mapped to a timestamp"] });
      return ct("date");
    case "year":
      return ct("i2", { notes: ["MySQL YEAR mapped to smallint"] });
    case "interval":
    case "interval year to month":
    case "interval day to second":
      return ct("interval", { raw });
    case "rowid":
    case "urowid":
      return ct("varchar", { len: 18, notes: ["ROWID mapped to varchar(18); the value is Oracle-specific"] });
    case "sql_variant":
      return ct("other", { raw, notes: ["sql_variant has no equivalent; review manually"] });
    case "rowversion":
      return ct("varbin", { len: 8, notes: ["rowversion is a row-change counter, not a time"] });
    case "inet":
    case "cidr":
    case "macaddr":
      return ct("varchar", { len: 43, notes: [base + " mapped to varchar; validation is lost"] });
  }

  // ---- char family -----------------------------------------------------------
  if (/^(national )?(char|character|nchar)$/.test(base) || base === "bpchar")
    return ct("char", { len: lenArg === undefined || lenArg === "max" ? 1 : lenArg, nat: base.startsWith("n") || base.startsWith("national") });
  if (/^(national )?(varchar|varchar2|nvarchar|nvarchar2|character varying|char varying|varying character)$/.test(base) || base === "string")
    return ct("varchar", { len: lenArg, nat: base.startsWith("n") || base.startsWith("national") });
  if (/^(tiny|medium|long)?text$/.test(base) || base === "clob" || base === "nclob" || base === "ntext" || base === "long" || base === "dbclob" || base === "graphic" || base === "vargraphic")
    return ct("text", { nat: base === "nclob" || base === "ntext" });

  // ---- binary -----------------------------------------------------------------
  if (base === "binary" || base === "char for bit data") return ct("bin", { len: lenArg === undefined ? 1 : lenArg });
  if (base === "varbinary" || base === "raw" || base === "bytea" || base === "varchar for bit data") return ct(base === "bytea" ? "blob" : "varbin", { len: lenArg === undefined ? (base === "bytea" ? undefined : "max") : lenArg });
  if (/^(tiny|medium|long)?blob$/.test(base) || base === "long raw" || base === "image") return ct("blob");
  if (base === "bit") {
    if (src === "mysql" && n0 !== undefined && n0 > 1) return ct("bin", { len: Math.ceil(n0 / 8), notes: ["BIT(" + n0 + ") mapped to binary"] });
    if (src === "postgresql" && n0 !== undefined && n0 > 1) return ct("varchar", { len: n0, notes: ["BIT(" + n0 + ") string mapped to varchar"] });
    return ct("bool");
  }
  if (base === "bit varying" || base === "varbit") return ct("varchar", { len: n0, notes: ["bit string mapped to varchar"] });

  // ---- temporal -----------------------------------------------------------------
  if (base === "time" || base === "timetz") return ct(tz || base === "timetz" ? "timetz" : "time", { fsp: n0 });
  if (base === "timestamptz") return ct("tstz", { fsp: n0 });
  if (base === "timestamp") {
    if (src === "sqlserver") return ct("varbin", { len: 8, notes: ["SQL Server TIMESTAMP is rowversion (a counter), not a date"] });
    if (src === "mysql") return ct("tstz", { fsp: n0, notes: ["MySQL TIMESTAMP is stored as UTC and converted by session time zone"] });
    return ct(tz ? "tstz" : "ts", { fsp: n0 ?? (src === "oracle" ? 6 : undefined) });
  }
  if (base === "datetime" || base === "datetime2" || base === "smalldatetime") return ct("ts", { fsp: base === "smalldatetime" ? 0 : n0 });
  if (base === "datetimeoffset") return ct("tstz", { fsp: n0 });

  // ---- Oracle NUMBER -------------------------------------------------------------
  if (base === "number") {
    const p = num(a[0]);
    const s = a[1] === undefined ? undefined : num(a[1]) ?? 0;
    if (p === undefined && a[0] === undefined) return ct("dec", { notes: ["NUMBER with no precision accepts any value; mapped to unconstrained numeric"] });
    if (p === 1 && (s ?? 0) === 0 && po.numberOneAsBoolean) return ct("bool");
    if ((s === undefined || s === 0) && p !== undefined && po.integers === "smart") {
      if (p <= 4) return ct("i2", { p });
      if (p <= 9) return ct("i4", { p });
      if (p <= 18) return ct("i8", { p });
    }
    return ct("dec", { p, s: s ?? (a[0] === "*" ? undefined : 0) });
  }
  return ct("other", { raw, notes: [`Unknown type "${raw}" copied unchanged`] });
}
