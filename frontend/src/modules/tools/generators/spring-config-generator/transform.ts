import { dump } from "js-yaml";
import type { TransformResult } from "@/lib/tool-transform";
import type { SpringConfigGeneratorOptions } from "./schema";

type Obj = Record<string, unknown>;

const DB: Record<string, { driver: string; url: (h: string, p: string, n: string) => string; port: string; dialect?: string }> = {
  oracle: { driver: "oracle.jdbc.OracleDriver", url: (h, p, n) => `jdbc:oracle:thin:@//${h}:${p}/${n}`, port: "1521", dialect: "org.hibernate.dialect.OracleDialect" },
  postgresql: { driver: "org.postgresql.Driver", url: (h, p, n) => `jdbc:postgresql://${h}:${p}/${n}`, port: "5432" },
  mysql: { driver: "com.mysql.cj.jdbc.Driver", url: (h, p, n) => `jdbc:mysql://${h}:${p}/${n}`, port: "3306" },
  h2: { driver: "org.h2.Driver", url: (_h, _p, n) => `jdbc:h2:mem:${n}`, port: "" },
};
const FEATURES = ["actuator", "jpa", "flyway", "redis", "kafka", "oauth2-resource-server", "openapi", "cache", "mail", "virtual-threads", "graceful-shutdown", "problem-details"] as const;

const list = (s?: string) => (s ?? "").split(/[,\s]+/).filter(Boolean);

function fields(input: string): Record<string, string> {
  const f: Record<string, string> = {};
  for (const l of input.split(/\r?\n/)) {
    const i = l.indexOf(":");
    if (i > 0 && !l.trim().startsWith("#")) f[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim();
  }
  return f;
}

/** Deep-set using dotted keys so shared prefixes merge in YAML. */
function set(o: Obj, key: string, value: unknown) {
  const parts = key.split(".");
  let cur = o;
  for (const p of parts.slice(0, -1)) { cur = (cur[p] ??= {}) as Obj; }
  cur[parts[parts.length - 1]!] = value;
}

export function flattenProps(o: unknown, prefix = ""): Array<[string, string]> {
  if (Array.isArray(o)) return o.flatMap((v, i) => flattenProps(v, `${prefix}[${i}]`));
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => flattenProps(v, prefix ? `${prefix}.${k}` : k));
  return [[prefix, String(o)]];
}

export function buildSpringConfig(f: Record<string, string>, o: SpringConfigGeneratorOptions): { cfg: Obj; notes: string[] } | string {
  const cfg: Obj = {}, notes: string[] = [];
  const prod = o.profile === "prod", dev = o.profile === "dev";
  const features = list(f.features);
  const bad = features.find((x) => !(FEATURES as readonly string[]).includes(x));
  if (bad) return `Unknown feature "${bad}". Supported: ${FEATURES.join(", ")}`;
  const has = (x: (typeof FEATURES)[number]) => features.includes(x);
  const port = f.port ?? "8080";
  if (!/^\d{1,5}$/.test(port) || Number(port) > 65535) return "port must be 1-65535";
  if (f.app) set(cfg, "spring.application.name", f.app);
  set(cfg, "server.port", Number(port));
  if (has("graceful-shutdown") || prod) { set(cfg, "server.shutdown", "graceful"); set(cfg, "spring.lifecycle.timeout-per-shutdown-phase", "30s"); }
  if (has("virtual-threads")) { set(cfg, "spring.threads.virtual.enabled", true); notes.push("virtual-threads needs Java 21+ and Spring Boot 3.2+."); }
  if (has("problem-details")) set(cfg, "spring.mvc.problemdetails.enabled", true);

  if (f.db) {
    const db = DB[f.db.toLowerCase()];
    if (!db) return `Unknown db "${f.db}". Supported: ${Object.keys(DB).join(", ")}`;
    const host = f["db-host"] ?? "localhost", name = f["db-name"] ?? (f.db === "oracle" ? "ORCLPDB1" : f.app ?? "app");
    set(cfg, "spring.datasource.url", f.db === "h2" ? db.url("", "", name) : "${DB_URL:" + db.url(host, f["db-port"] ?? db.port, name) + "}");
    set(cfg, "spring.datasource.username", "${DB_USERNAME:" + (f["db-user"] ?? "app") + "}");
    set(cfg, "spring.datasource.password", "${DB_PASSWORD}");
    set(cfg, "spring.datasource.driver-class-name", db.driver);
    set(cfg, "spring.datasource.hikari.maximum-pool-size", prod ? 20 : 5);
    set(cfg, "spring.datasource.hikari.connection-timeout", 30000);
    notes.push("The password is read from the DB_PASSWORD environment variable. Do not commit real credentials to this file.");
    if (has("jpa")) {
      set(cfg, "spring.jpa.open-in-view", false);
      set(cfg, "spring.jpa.hibernate.ddl-auto", prod || has("flyway") ? "validate" : dev ? "update" : "validate");
      if (dev) set(cfg, "spring.jpa.show-sql", true);
      if (db.dialect) set(cfg, "spring.jpa.properties.hibernate.dialect", db.dialect);
      set(cfg, "spring.jpa.properties.hibernate.jdbc.batch_size", 50);
      if (!prod && !has("flyway") && dev) notes.push('ddl-auto "update" is for local development only; use "validate" with Flyway/Liquibase elsewhere.');
    }
    if (has("flyway")) { set(cfg, "spring.flyway.enabled", true); set(cfg, "spring.flyway.locations", "classpath:db/migration"); set(cfg, "spring.flyway.baseline-on-migrate", false); }
  } else if (has("jpa") || has("flyway")) return "jpa/flyway need a db: line (oracle, postgresql, mysql or h2)";

  if (has("redis")) { set(cfg, "spring.data.redis.host", "${REDIS_HOST:localhost}"); set(cfg, "spring.data.redis.port", "${REDIS_PORT:6379}"); set(cfg, "spring.data.redis.timeout", "2s"); }
  if (has("cache")) set(cfg, "spring.cache.type", has("redis") ? "redis" : "caffeine");
  if (has("kafka")) {
    set(cfg, "spring.kafka.bootstrap-servers", "${KAFKA_BOOTSTRAP:localhost:9092}");
    if (f.app) set(cfg, "spring.kafka.consumer.group-id", f.app);
    set(cfg, "spring.kafka.consumer.auto-offset-reset", "earliest");
    set(cfg, "spring.kafka.consumer.enable-auto-commit", false);
    set(cfg, "spring.kafka.producer.acks", "all");
  }
  if (has("mail")) { set(cfg, "spring.mail.host", "${MAIL_HOST}"); set(cfg, "spring.mail.port", 587); set(cfg, "spring.mail.properties.mail.smtp.starttls.enable", true); }
  if (has("oauth2-resource-server")) {
    if (!f.issuer || !/^https?:\/\//.test(f.issuer)) return "oauth2-resource-server needs an issuer: https://... line";
    set(cfg, "spring.security.oauth2.resourceserver.jwt.issuer-uri", f.issuer);
    notes.push("Spring fetches the issuer's OIDC discovery document on startup; make sure the service can reach it.");
  }
  if (has("actuator")) {
    set(cfg, "management.endpoints.web.exposure.include", prod ? "health,info,prometheus" : "health,info,metrics,prometheus");
    set(cfg, "management.endpoint.health.probes.enabled", true);
    set(cfg, "management.endpoint.health.show-details", prod ? "when-authorized" : "always");
    if (prod) notes.push("Actuator exposure is limited to health, info and prometheus. Secure /actuator/** or keep it on an internal management port.");
  }
  if (has("openapi")) { set(cfg, "springdoc.api-docs.enabled", !prod); set(cfg, "springdoc.swagger-ui.enabled", !prod); }
  set(cfg, "logging.level.root", prod ? "WARN" : "INFO");
  if (f.package) set(cfg, `logging.level.${f.package}`, dev ? "DEBUG" : "INFO");
  return { cfg, notes };
}

export function generateSpringConfig(input: string, o: SpringConfigGeneratorOptions): TransformResult {
  if (!input.trim()) return { output: "", error: null };
  const built = buildSpringConfig(fields(input), o);
  if (typeof built === "string") return { output: "", error: { message: built } };
  const header = o.profile === "default" ? "" : `# application-${o.profile}.${o.format === "yaml" ? "yml" : "properties"}\n`;
  const notes = built.notes.map((n) => `# NOTE: ${n}\n`).join("");
  const body = o.format === "yaml" ? dump(built.cfg, { lineWidth: -1, quoteStyle: "double" }) : flattenProps(built.cfg).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
  return { output: header + notes + body, error: null };
}
