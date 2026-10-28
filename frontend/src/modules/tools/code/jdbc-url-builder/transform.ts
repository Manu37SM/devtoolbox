import type { TransformResult } from "@/lib/tool-transform";
import type { JdbcUrlBuilderOptions } from "./schema";

export const DRIVERS: Record<string, { cls: string; port: number; label: string }> = {
  oracle: { cls: "oracle.jdbc.OracleDriver", port: 1521, label: "Oracle" },
  postgresql: { cls: "org.postgresql.Driver", port: 5432, label: "PostgreSQL" },
  mysql: { cls: "com.mysql.cj.jdbc.Driver", port: 3306, label: "MySQL" },
  mariadb: { cls: "org.mariadb.jdbc.Driver", port: 3306, label: "MariaDB" },
  sqlserver: { cls: "com.microsoft.sqlserver.jdbc.SQLServerDriver", port: 1433, label: "SQL Server" },
  db2: { cls: "com.ibm.db2.jcc.DB2Driver", port: 50000, label: "IBM Db2" },
  h2: { cls: "org.h2.Driver", port: 9092, label: "H2" },
};

export interface Parsed { database: string; host?: string; port?: number; name?: string; style?: string; params: Record<string, string>; raw: string }

export function parseJdbc(url: string): Parsed {
  const u = url.trim();
  if (!/^jdbc:/i.test(u)) throw new Error('JDBC URLs start with "jdbc:"');
  let m = /^jdbc:oracle:(?:thin|oci):@\/\/([^:/\s]+)(?::(\d+))?\/([^?\s]+)$/i.exec(u);
  if (m) return { database: "oracle", host: m[1], port: m[2] ? Number(m[2]) : 1521, name: m[3], style: "service name", params: {}, raw: u };
  m = /^jdbc:oracle:(?:thin|oci):@([^:/\s(]+):(\d+):([^?\s]+)$/i.exec(u);
  if (m) return { database: "oracle", host: m[1], port: Number(m[2]), name: m[3], style: "SID (legacy)", params: {}, raw: u };
  m = /^jdbc:oracle:(?:thin|oci):@(\(.*\))$/i.exec(u);
  if (m) {
    const g = (k: string) => new RegExp(`${k}\\s*=\\s*([^)\\s]+)`, "i").exec(m![1]!)?.[1];
    return { database: "oracle", host: g("HOST"), port: g("PORT") ? Number(g("PORT")) : undefined, name: g("SERVICE_NAME") ?? g("SID"), style: "TNS descriptor", params: {}, raw: u };
  }
  m = /^jdbc:(postgresql|mysql|mariadb|db2):\/\/([^:/?\s]+)(?::(\d+))?(?:\/([^?\s]*))?(?:\?(.*))?$/i.exec(u);
  if (m) {
    const db = m[1]!.toLowerCase();
    return { database: db, host: m[2], port: m[3] ? Number(m[3]) : DRIVERS[db]!.port, name: m[4] || undefined, style: "URL", params: parseQuery(m[5] ?? "", "&"), raw: u };
  }
  m = /^jdbc:sqlserver:\/\/([^:;\s]+)(?::(\d+))?(?:;(.*))?$/i.exec(u);
  if (m) {
    const params = parseQuery(m[3] ?? "", ";");
    const name = params.databaseName ?? params.database; delete params.databaseName; delete params.database;
    return { database: "sqlserver", host: m[1], port: m[2] ? Number(m[2]) : 1433, name, style: "semicolon properties", params, raw: u };
  }
  m = /^jdbc:h2:(mem|file|tcp|ssl):(.*?)(;.*)?$/i.exec(u);
  if (m) return { database: "h2", name: m[2], style: `${m[1]!.toLowerCase()} mode`, params: parseQuery((m[3] ?? "").slice(1), ";"), raw: u };
  m = /^jdbc:sqlite:(.+)$/i.exec(u);
  if (m) return { database: "sqlite", name: m[1], style: "file", params: {}, raw: u };
  throw new Error("Unrecognized JDBC URL format");
}

function parseQuery(q: string, sep: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of q.split(sep)) {
    if (!part) continue;
    const i = part.indexOf("=");
    const k = i < 0 ? part : part.slice(0, i);
    out[safe(decodeURIComponent(k))] = i < 0 ? "" : decodeURIComponent(part.slice(i + 1));
  }
  return out;
}
const safe = (k: string) => (k === "__proto__" ? "_proto_" : k);

export interface BuildInput { host?: string; port?: string; database?: string; sid?: string; params: [string, string][] }

export function parseBuildInput(text: string): BuildInput {
  const r: BuildInput = { params: [] };
  for (const [i, raw] of text.split(/\r?\n/).entries()) {
    const l = raw.trim();
    if (!l || l.startsWith("#")) continue;
    const m = /^([A-Za-z_.-]+)\s*[:=]\s*(.*)$/.exec(l);
    if (!m) throw Object.assign(new Error(`Expected "key: value", got "${l}"`), { line: i + 1 });
    const k = m[1]!.toLowerCase(), v = m[2]!.trim();
    if (k === "host") r.host = v; else if (k === "port") r.port = v;
    else if (["database", "db", "name", "service", "schema"].includes(k)) r.database = v;
    else if (k === "sid") r.sid = v;
    else if (k === "param" || k === "option") { const j = v.indexOf("="); r.params.push(j < 0 ? [v, ""] : [v.slice(0, j), v.slice(j + 1)]); }
    else throw Object.assign(new Error(`Unknown key "${m[1]}" (use host, port, database, sid, param)`), { line: i + 1 });
  }
  return r;
}

export function buildJdbc(db: JdbcUrlBuilderOptions["database"], b: BuildInput): string {
  const port = b.port ? Number(b.port) : DRIVERS[db]!.port;
  if (b.port && (!/^\d+$/.test(b.port) || port < 1 || port > 65535)) throw new Error(`Invalid port "${b.port}"`);
  if (db !== "h2" && !b.host) throw new Error("host is required");
  const enc = encodeURIComponent;
  const q = b.params.map(([k, v]) => `${enc(k)}=${enc(v)}`).join("&");
  switch (db) {
    case "oracle":
      if (b.sid) return `jdbc:oracle:thin:@${b.host}:${port}:${b.sid}`;
      if (!b.database) throw new Error("Oracle needs a service name (database:) or a sid:");
      return `jdbc:oracle:thin:@//${b.host}:${port}/${b.database}`;
    case "sqlserver":
      return `jdbc:sqlserver://${b.host}:${port}${[...(b.database ? [["databaseName", b.database]] : []), ...b.params].map(([k, v]) => `;${k}=${v}`).join("")}`;
    case "h2":
      return b.host ? `jdbc:h2:tcp://${b.host}:${port}/${b.database ?? "test"}${b.params.map(([k, v]) => `;${k}=${v}`).join("")}` : `jdbc:h2:mem:${b.database ?? "testdb"}${b.params.map(([k, v]) => `;${k}=${v}`).join("")}`;
    default:
      return `jdbc:${db}://${b.host}:${port}${b.database ? "/" + b.database : ""}${q ? "?" + q : ""}`;
  }
}

export function runJdbc(input: string, o: JdbcUrlBuilderOptions): TransformResult {
  const text = input.trim();
  if (!text) return { output: "", error: null };
  try {
    if (/^jdbc:/i.test(text)) {
      const p = parseJdbc(text.split(/\r?\n/)[0]!);
      const d = DRIVERS[p.database];
      const rows = [`Database:  ${d?.label ?? p.database}`, ...(p.style ? [`Format:    ${p.style}`] : []), ...(p.host ? [`Host:      ${p.host}`] : []), ...(p.port ? [`Port:      ${p.port}`] : []), ...(p.name ? [`Name:      ${p.name}`] : [])];
      const pe = Object.entries(p.params);
      if (pe.length) rows.push("Params:", ...pe.map(([k, v]) => `  ${k} = ${v}`));
      if (d) rows.push(`Driver:    ${d.cls}`);
      const w: string[] = [];
      if (p.database === "oracle" && p.style === "SID (legacy)") w.push("SID-style URLs are legacy; prefer the //host:port/service form");
      if (p.database === "sqlserver" && !("encrypt" in p.params)) w.push("SQL Server driver 10+ defaults to encrypt=true; add trustServerCertificate=true only for dev");
      if (p.database === "mysql" && !("useSSL" in p.params) && !("sslMode" in p.params)) w.push("MySQL: set sslMode explicitly in production");
      return { output: [...rows, ...w.map((x) => `⚠ ${x}`)].join("\n"), error: null };
    }
    const url = buildJdbc(o.database, parseBuildInput(text));
    const d = DRIVERS[o.database]!;
    const out = [url];
    if (o.showSpring) out.push("", "# Spring Boot", `spring.datasource.url=${url}`, `spring.datasource.driver-class-name=${d.cls}`, "spring.datasource.username=", "spring.datasource.password=");
    return { output: out.join("\n"), error: null };
  } catch (e) {
    const line = (e as { line?: number }).line;
    return { output: "", error: { message: (e as Error).message, ...(line ? { line } : {}) } };
  }
}
