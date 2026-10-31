import type { CType, Dialect } from "./types";

export interface RenderOpts {
  unicode: boolean;
  jsonb: boolean;
  oracleBoolean: boolean;
}

const clampP = (p: number | undefined, max: number, notes: string[], label: string): number | undefined => {
  if (p !== undefined && p > max) {
    notes.push(`${label}: precision ${p} exceeds the target maximum ${max}; reduced to ${max}`);
    return max;
  }
  return p;
};
const decStr = (name: string, t: CType, max: number, notes: string[], maxScale?: number): string => {
  const p = clampP(t.p, max, notes, name);
  let s = t.s;
  if (maxScale !== undefined && s !== undefined && s > maxScale) {
    notes.push(`${name}: scale ${s} exceeds ${maxScale}; reduced`);
    s = maxScale;
  }
  if (p === undefined) return name;
  return s !== undefined && s !== 0 ? `${name}(${p},${s})` : s === 0 && t.s !== undefined ? `${name}(${p},0)` : `${name}(${p})`;
};
const fsp = (t: CType, max: number, notes: string[]): string => {
  if (t.fsp === undefined) return "";
  let f = t.fsp;
  if (f > max) {
    notes.push(`fractional seconds ${f} exceeds target maximum ${max}; reduced`);
    f = max;
  }
  return `(${f})`;
};

export function render(d: Dialect, t: CType, o: RenderOpts): { type: string; notes: string[] } {
  const notes: string[] = [...t.notes];
  const u = o.unicode || !!t.nat;
  let type = "";
  const L = t.len;
  switch (d) {
    case "postgresql":
      switch (t.k) {
        case "bool": type = "boolean"; break;
        case "i1": type = "smallint"; if (t.unsigned) notes.push("unsigned tinyint widened to smallint"); break;
        case "i2": type = "smallint"; break;
        case "i4": type = t.unsigned ? "bigint" : "integer"; if (t.unsigned) notes.push("unsigned int widened to bigint"); break;
        case "i8": type = t.unsigned ? "numeric(20,0)" : "bigint"; if (t.unsigned) notes.push("unsigned bigint needs numeric(20,0)"); break;
        case "dec": type = t.p === undefined ? "numeric" : decStr("numeric", t, 1000, notes); break;
        case "f4": type = "real"; break;
        case "f8": type = "double precision"; break;
        case "money": type = "numeric(19,4)"; notes.push("money mapped to numeric(19,4); avoid PostgreSQL's locale-bound money type"); break;
        case "char": type = `char(${L ?? 1})`; break;
        case "varchar": type = L === undefined || L === "max" ? "text" : `varchar(${L})`; if (L === "max") notes.push("varchar(max) mapped to text"); break;
        case "text": type = "text"; break;
        case "bin": case "varbin": case "blob": type = "bytea"; break;
        case "date": type = "date"; break;
        case "time": type = "time" + fsp(t, 6, notes); break;
        case "timetz": type = "time" + fsp(t, 6, notes) + " with time zone"; break;
        case "ts": type = "timestamp" + fsp(t, 6, notes); break;
        case "tstz": type = "timestamptz" + fsp(t, 6, notes); break;
        case "interval": type = "interval"; break;
        case "uuid": type = "uuid"; break;
        case "json": type = o.jsonb ? "jsonb" : "json"; break;
        case "xml": type = "xml"; break;
        default: type = t.raw ?? "text";
      }
      break;
    case "mysql":
      switch (t.k) {
        case "bool": type = "tinyint(1)"; break;
        case "i1": type = t.unsigned ? "tinyint unsigned" : "tinyint"; break;
        case "i2": type = "smallint"; break;
        case "i4": type = t.unsigned ? "int unsigned" : "int"; break;
        case "i8": type = t.unsigned ? "bigint unsigned" : "bigint"; break;
        case "dec": type = t.p === undefined ? "decimal(65,30)" : decStr("decimal", t, 65, notes, 30); if (t.p === undefined) notes.push("unconstrained NUMBER mapped to decimal(65,30)"); break;
        case "f4": type = "float"; break;
        case "f8": type = "double"; break;
        case "money": type = "decimal(19,4)"; break;
        case "char": type = `char(${Math.min(Number(L ?? 1), 255)})`; if (Number(L) > 255) notes.push("MySQL CHAR is limited to 255"); break;
        case "varchar":
          if (L === undefined || L === "max" || L > 16383) { type = "longtext"; notes.push("length above 16383 (utf8mb4 row limit) mapped to longtext"); }
          else type = `varchar(${L})`;
          break;
        case "text": type = "longtext"; break;
        case "bin": type = `binary(${Math.min(Number(L ?? 1), 255)})`; break;
        case "varbin": type = L === undefined || L === "max" || L > 65000 ? "longblob" : `varbinary(${L})`; break;
        case "blob": type = "longblob"; break;
        case "date": type = "date"; break;
        case "time": type = "time" + fsp(t, 6, notes); break;
        case "timetz": type = "time" + fsp(t, 6, notes); notes.push("MySQL TIME has no time zone; offset dropped"); break;
        case "ts": type = "datetime" + fsp(t, 6, notes); break;
        case "tstz": type = "datetime" + fsp(t, 6, notes); notes.push("MySQL has no timezone-aware column; store UTC in a datetime (or use timestamp, which is 2038-limited)"); break;
        case "interval": type = "varchar(64)"; notes.push("interval has no MySQL type; stored as text"); break;
        case "uuid": type = "char(36)"; notes.push("uuid stored as char(36); binary(16) is smaller and faster to index"); break;
        case "json": type = "json"; break;
        case "xml": type = "longtext"; break;
        default: type = t.raw ?? "text";
      }
      break;
    case "sqlserver":
      switch (t.k) {
        case "bool": type = "bit"; break;
        case "i1": type = t.unsigned ? "tinyint" : "smallint"; if (!t.unsigned) notes.push("signed tinyint widened to smallint (SQL Server tinyint is 0-255)"); break;
        case "i2": type = "smallint"; break;
        case "i4": type = t.unsigned ? "bigint" : "int"; break;
        case "i8": type = t.unsigned ? "decimal(20,0)" : "bigint"; break;
        case "dec": type = t.p === undefined ? "decimal(38,10)" : decStr("decimal", t, 38, notes); if (t.p === undefined) notes.push("unconstrained NUMBER mapped to decimal(38,10); choose a real precision"); break;
        case "f4": type = "real"; break;
        case "f8": type = "float(53)"; break;
        case "money": type = "money"; break;
        case "char": type = `${u ? "nchar" : "char"}(${Math.min(Number(L ?? 1), u ? 4000 : 8000)})`; break;
        case "varchar": type = L === undefined || L === "max" || L > (u ? 4000 : 8000) ? `${u ? "nvarchar" : "varchar"}(max)` : `${u ? "nvarchar" : "varchar"}(${L})`; break;
        case "text": type = `${u ? "nvarchar" : "varchar"}(max)`; break;
        case "bin": type = `binary(${Math.min(Number(L ?? 1), 8000)})`; break;
        case "varbin": type = L === undefined || L === "max" || L > 8000 ? "varbinary(max)" : `varbinary(${L})`; break;
        case "blob": type = "varbinary(max)"; break;
        case "date": type = "date"; break;
        case "time": type = "time" + fsp(t, 7, notes); break;
        case "timetz": type = "time" + fsp(t, 7, notes); notes.push("SQL Server TIME has no time zone; offset dropped"); break;
        case "ts": type = "datetime2" + fsp(t, 7, notes); break;
        case "tstz": type = "datetimeoffset" + fsp(t, 7, notes); break;
        case "interval": type = "varchar(64)"; notes.push("interval has no SQL Server type; stored as text"); break;
        case "uuid": type = "uniqueidentifier"; break;
        case "json": type = "nvarchar(max)"; notes.push("JSON stored as nvarchar(max); add CHECK (ISJSON(col) = 1)"); break;
        case "xml": type = "xml"; break;
        default: type = t.raw ?? "nvarchar(max)";
      }
      break;
    case "oracle":
      switch (t.k) {
        case "bool": type = o.oracleBoolean ? "BOOLEAN" : "NUMBER(1)"; if (!o.oracleBoolean) notes.push("Oracle before 23ai has no BOOLEAN; NUMBER(1) used (add CHECK (col IN (0,1)))"); break;
        case "i1": type = "NUMBER(3)"; break;
        case "i2": type = "NUMBER(5)"; break;
        case "i4": type = t.unsigned ? "NUMBER(10)" : "NUMBER(10)"; break;
        case "i8": type = t.unsigned ? "NUMBER(20)" : "NUMBER(19)"; break;
        case "dec": {
          const p = clampP(t.p, 38, notes, "NUMBER");
          type = p === undefined ? "NUMBER" : t.s ? `NUMBER(${p},${t.s})` : `NUMBER(${p}${t.s === 0 ? ",0" : ""})`;
          break;
        }
        case "f4": type = "BINARY_FLOAT"; break;
        case "f8": type = "BINARY_DOUBLE"; break;
        case "money": type = "NUMBER(19,4)"; break;
        case "char": type = `${u ? "NCHAR" : "CHAR"}(${Math.min(Number(L ?? 1), 2000)})`; break;
        case "varchar":
          if (L === undefined || L === "max" || L > 4000) { type = u ? "NCLOB" : "CLOB"; notes.push("length above 4000 mapped to CLOB (or use VARCHAR2(32767) with MAX_STRING_SIZE=EXTENDED)"); }
          else type = `${u ? "NVARCHAR2" : "VARCHAR2"}(${L}${u ? "" : " CHAR"})`;
          break;
        case "text": type = u ? "NCLOB" : "CLOB"; break;
        case "bin": case "varbin": type = L === undefined || L === "max" || Number(L) > 2000 ? "BLOB" : `RAW(${L})`; break;
        case "blob": type = "BLOB"; break;
        case "date": type = "DATE"; break;
        case "time": type = "TIMESTAMP(" + (t.fsp ?? 0) + ")"; notes.push("Oracle has no TIME type; stored as a TIMESTAMP on a dummy date"); break;
        case "timetz": type = "TIMESTAMP(" + (t.fsp ?? 0) + ") WITH TIME ZONE"; notes.push("Oracle has no TIME type; stored as TIMESTAMP WITH TIME ZONE"); break;
        case "ts": type = t.fsp === 0 ? "DATE" : "TIMESTAMP" + fsp(t, 9, notes); if (t.fsp === 0) notes.push("timestamp(0) mapped to DATE (Oracle DATE holds seconds)"); break;
        case "tstz": type = "TIMESTAMP" + fsp(t, 9, notes) + " WITH TIME ZONE"; break;
        case "interval": type = t.raw && /year/i.test(t.raw) ? "INTERVAL YEAR TO MONTH" : "INTERVAL DAY TO SECOND"; break;
        case "uuid": type = "RAW(16)"; notes.push("uuid stored as RAW(16); convert with HEXTORAW / RAWTOHEX"); break;
        case "json": type = "JSON"; notes.push("JSON type needs Oracle 21c+; on 12c-19c use CLOB with CHECK (col IS JSON)"); break;
        case "xml": type = "XMLTYPE"; break;
        default: type = t.raw ?? "CLOB";
      }
      break;
    case "sqlite":
      switch (t.k) {
        case "bool": case "i1": case "i2": case "i4": case "i8": type = "INTEGER"; break;
        case "dec": case "money": type = "NUMERIC"; notes.push("SQLite stores NUMERIC as integer or 8-byte float, so exact decimals can lose precision; keep money as integer minor units"); break;
        case "f4": case "f8": type = "REAL"; break;
        case "char": case "varchar": case "text": case "xml": case "json": case "uuid": case "interval": type = "TEXT"; break;
        case "bin": case "varbin": case "blob": type = "BLOB"; break;
        case "date": case "time": case "timetz": case "ts": case "tstz": type = "TEXT"; notes.push("SQLite has no date type; ISO-8601 text is the convention"); break;
        default: type = t.raw ?? "TEXT";
      }
      break;
    case "db2":
      switch (t.k) {
        case "bool": type = "BOOLEAN"; notes.push("BOOLEAN needs Db2 11.1.1+; older: SMALLINT"); break;
        case "i1": case "i2": type = "SMALLINT"; break;
        case "i4": type = t.unsigned ? "BIGINT" : "INTEGER"; break;
        case "i8": type = t.unsigned ? "DECIMAL(20,0)" : "BIGINT"; break;
        case "dec": type = t.p === undefined ? "DECIMAL(31,10)" : decStr("DECIMAL", t, 31, notes); if (t.p === undefined) notes.push("unconstrained NUMBER mapped to DECIMAL(31,10)"); break;
        case "f4": type = "REAL"; break;
        case "f8": type = "DOUBLE"; break;
        case "money": type = "DECIMAL(19,4)"; break;
        case "char": type = `CHAR(${Math.min(Number(L ?? 1), 255)})`; break;
        case "varchar": type = L === undefined || L === "max" || L > 32672 ? "CLOB" : `VARCHAR(${L})`; break;
        case "text": type = "CLOB"; break;
        case "bin": type = `CHAR(${Math.min(Number(L ?? 1), 255)}) FOR BIT DATA`; break;
        case "varbin": type = L === undefined || L === "max" ? "BLOB" : `VARCHAR(${L}) FOR BIT DATA`; break;
        case "blob": type = "BLOB"; break;
        case "date": type = "DATE"; break;
        case "time": type = "TIME"; break;
        case "timetz": type = "TIME"; notes.push("Db2 TIME has no time zone; offset dropped"); break;
        case "ts": type = "TIMESTAMP" + fsp(t, 12, notes); break;
        case "tstz": type = "TIMESTAMP" + fsp(t, 12, notes); notes.push("Db2 LUW has no timezone-aware column (Db2 12.1 adds TIMESTAMP WITH TIME ZONE); offset dropped"); break;
        case "interval": type = "VARCHAR(64)"; notes.push("interval stored as text"); break;
        case "uuid": type = "CHAR(36)"; break;
        case "json": type = "CLOB"; notes.push("JSON stored as CLOB (Db2 offers BSON via SYSTOOLS functions)"); break;
        case "xml": type = "XML"; break;
        default: type = t.raw ?? "CLOB";
      }
      break;
  }
  return { type, notes };
}

export interface Lang {
  java: string;
  jdbc: string;
  ts: string;
}

export function langTypes(t: CType): Lang {
  switch (t.k) {
    case "bool": return { java: "boolean / Boolean", jdbc: "Types.BOOLEAN", ts: "boolean" };
    case "i1": return { java: "short", jdbc: "Types.SMALLINT", ts: "number" };
    case "i2": return { java: "short", jdbc: "Types.SMALLINT", ts: "number" };
    case "i4": return { java: t.unsigned ? "long" : "int / Integer", jdbc: t.unsigned ? "Types.BIGINT" : "Types.INTEGER", ts: "number" };
    case "i8": return { java: t.unsigned ? "BigInteger" : "long / Long", jdbc: "Types.BIGINT", ts: "string (bigint exceeds 2^53; drivers return strings)" };
    case "dec": return { java: "BigDecimal", jdbc: "Types.NUMERIC", ts: "string (keep decimals exact; do not use number)" };
    case "money": return { java: "BigDecimal", jdbc: "Types.DECIMAL", ts: "string" };
    case "f4": return { java: "float", jdbc: "Types.REAL", ts: "number" };
    case "f8": return { java: "double", jdbc: "Types.DOUBLE", ts: "number" };
    case "char": return { java: "String", jdbc: "Types.CHAR", ts: "string" };
    case "varchar": case "text": return { java: "String", jdbc: t.k === "text" ? "Types.CLOB" : "Types.VARCHAR", ts: "string" };
    case "bin": case "varbin": return { java: "byte[]", jdbc: "Types.VARBINARY", ts: "Uint8Array / Buffer" };
    case "blob": return { java: "byte[] / InputStream", jdbc: "Types.BLOB", ts: "Uint8Array / Buffer" };
    case "date": return { java: "LocalDate", jdbc: "Types.DATE", ts: "string (YYYY-MM-DD)" };
    case "time": return { java: "LocalTime", jdbc: "Types.TIME", ts: "string (HH:mm:ss)" };
    case "timetz": return { java: "OffsetTime", jdbc: "Types.TIME_WITH_TIMEZONE", ts: "string" };
    case "ts": return { java: "LocalDateTime", jdbc: "Types.TIMESTAMP", ts: "string / Date" };
    case "tstz": return { java: "OffsetDateTime / Instant", jdbc: "Types.TIMESTAMP_WITH_TIMEZONE", ts: "string (ISO 8601) / Date" };
    case "interval": return { java: "Duration / Period", jdbc: "Types.OTHER", ts: "string (ISO 8601 duration)" };
    case "uuid": return { java: "UUID", jdbc: "Types.OTHER / BINARY", ts: "string" };
    case "json": return { java: "String / JsonNode", jdbc: "Types.OTHER", ts: "unknown / typed object" };
    case "xml": return { java: "String / SQLXML", jdbc: "Types.SQLXML", ts: "string" };
    default: return { java: "Object", jdbc: "Types.OTHER", ts: "unknown" };
  }
}
