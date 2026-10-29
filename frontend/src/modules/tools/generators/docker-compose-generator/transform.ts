import { dump } from "js-yaml";
import type { TransformResult } from "@/lib/tool-transform";
import type { DockerComposeGeneratorOptions } from "./schema";

type Obj = Record<string, unknown>;
interface Def { image: string; ports: string[]; env: [string, string][]; volume?: [string, string]; health?: string[]; command?: string[]; note?: string; appEnv?: (v: (k: string) => string) => [string, string][] }

/** Image tags checked against Docker Hub / Quay in October 2026. */
export const SERVICES: Record<string, Def> = {
  postgres: { image: "postgres:17-alpine", ports: ["5432:5432"], env: [["POSTGRES_USER", "app"], ["POSTGRES_PASSWORD", "app"], ["POSTGRES_DB", "app"]], volume: ["pgdata", "/var/lib/postgresql/data"], health: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"], appEnv: (v) => [["SPRING_DATASOURCE_URL", "jdbc:postgresql://postgres:5432/app"], ["SPRING_DATASOURCE_USERNAME", v("POSTGRES_USER")], ["SPRING_DATASOURCE_PASSWORD", v("POSTGRES_PASSWORD")]] },
  mysql: { image: "mysql:8.4", ports: ["3306:3306"], env: [["MYSQL_ROOT_PASSWORD", "root"], ["MYSQL_DATABASE", "app"], ["MYSQL_USER", "app"], ["MYSQL_PASSWORD", "app"]], volume: ["mysqldata", "/var/lib/mysql"], health: ["CMD", "mysqladmin", "ping", "-h", "localhost"], appEnv: (v) => [["SPRING_DATASOURCE_URL", "jdbc:mysql://mysql:3306/app"], ["SPRING_DATASOURCE_USERNAME", v("MYSQL_USER")], ["SPRING_DATASOURCE_PASSWORD", v("MYSQL_PASSWORD")]] },
  oracle: { image: "gvenzl/oracle-free:23-slim", ports: ["1521:1521"], env: [["ORACLE_PASSWORD", "oracle"], ["APP_USER", "app"], ["APP_USER_PASSWORD", "app"]], volume: ["oradata", "/opt/oracle/oradata"], health: ["CMD", "healthcheck.sh"], note: "Oracle Free takes a few minutes on first start; the healthcheck waits for it.", appEnv: (v) => [["SPRING_DATASOURCE_URL", "jdbc:oracle:thin:@//oracle:1521/FREEPDB1"], ["SPRING_DATASOURCE_USERNAME", v("APP_USER")], ["SPRING_DATASOURCE_PASSWORD", v("APP_USER_PASSWORD")]] },
  mongo: { image: "mongo:8.0", ports: ["27017:27017"], env: [["MONGO_INITDB_ROOT_USERNAME", "root"], ["MONGO_INITDB_ROOT_PASSWORD", "root"]], volume: ["mongodata", "/data/db"], health: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping')"], appEnv: (v) => [["SPRING_DATA_MONGODB_URI", `mongodb://${v("MONGO_INITDB_ROOT_USERNAME")}:${v("MONGO_INITDB_ROOT_PASSWORD")}@mongo:27017/app?authSource=admin`]] },
  redis: { image: "redis:8.8-alpine", ports: ["6379:6379"], env: [], volume: ["redisdata", "/data"], health: ["CMD", "redis-cli", "ping"], appEnv: () => [["SPRING_DATA_REDIS_HOST", "redis"]] },
  kafka: {
    image: "apache/kafka:4.4.0", ports: ["9092:9092"],
    env: [["KAFKA_NODE_ID", "1"], ["KAFKA_PROCESS_ROLES", "broker,controller"], ["KAFKA_LISTENERS", "INTERNAL://:29092,EXTERNAL://:9092,CONTROLLER://:9093"], ["KAFKA_ADVERTISED_LISTENERS", "INTERNAL://kafka:29092,EXTERNAL://localhost:9092"], ["KAFKA_LISTENER_SECURITY_PROTOCOL_MAP", "INTERNAL:PLAINTEXT,EXTERNAL:PLAINTEXT,CONTROLLER:PLAINTEXT"], ["KAFKA_INTER_BROKER_LISTENER_NAME", "INTERNAL"], ["KAFKA_CONTROLLER_LISTENER_NAMES", "CONTROLLER"], ["KAFKA_CONTROLLER_QUORUM_VOTERS", "1@kafka:9093"], ["KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR", "1"], ["KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR", "1"], ["KAFKA_TRANSACTION_STATE_LOG_MIN_ISR", "1"], ["KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS", "0"]],
    health: ["CMD-SHELL", "/opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092 > /dev/null 2>&1"],
    note: "Kafka in KRaft mode: containers use kafka:29092, your host uses localhost:9092.",
    appEnv: () => [["SPRING_KAFKA_BOOTSTRAP_SERVERS", "kafka:29092"]],
  },
  rabbitmq: { image: "rabbitmq:4.3-management-alpine", ports: ["5672:5672", "15672:15672"], env: [["RABBITMQ_DEFAULT_USER", "app"], ["RABBITMQ_DEFAULT_PASS", "app"]], volume: ["rabbitdata", "/var/lib/rabbitmq"], health: ["CMD", "rabbitmq-diagnostics", "-q", "ping"], note: "RabbitMQ management UI: http://localhost:15672", appEnv: (v) => [["SPRING_RABBITMQ_HOST", "rabbitmq"], ["SPRING_RABBITMQ_USERNAME", v("RABBITMQ_DEFAULT_USER")], ["SPRING_RABBITMQ_PASSWORD", v("RABBITMQ_DEFAULT_PASS")]] },
  keycloak: { image: "quay.io/keycloak/keycloak:26.6", ports: ["8180:8080"], env: [["KC_BOOTSTRAP_ADMIN_USERNAME", "admin"], ["KC_BOOTSTRAP_ADMIN_PASSWORD", "admin"]], command: ["start-dev"], note: "Keycloak admin console: http://localhost:8180 (dev mode; never use start-dev in production).", appEnv: () => [["SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI", "http://keycloak:8080/realms/app"]] },
  mailpit: { image: "axllent/mailpit:v1", ports: ["1025:1025", "8025:8025"], env: [], note: "Mailpit catches all SMTP mail: send to mailpit:1025, read at http://localhost:8025.", appEnv: () => [["SPRING_MAIL_HOST", "mailpit"], ["SPRING_MAIL_PORT", "1025"]] },
  localstack: { image: "localstack/localstack:2026.10", ports: ["4566:4566"], env: [["SERVICES", "s3,sqs,sns,dynamodb"]], volume: ["localstackdata", "/var/lib/localstack"], note: "LocalStack: point AWS SDKs at http://localhost:4566 (from containers: http://localstack:4566). Recent LocalStack releases need an auth token for some features.", appEnv: () => [["AWS_ENDPOINT_URL", "http://localstack:4566"], ["AWS_REGION", "us-east-1"], ["AWS_ACCESS_KEY_ID", "test"], ["AWS_SECRET_ACCESS_KEY", "test"]] },
};

export function runDockerComposeGenerator(input: string, options: DockerComposeGeneratorOptions): TransformResult {
  const f = new Map<string, string>();
  for (const line of input.split(/\r?\n/)) { const m = /^\s*([\w-]+)\s*:\s*(.*)$/.exec(line); if (m) f.set(m[1]!.toLowerCase(), m[2]!.trim()); }
  const wanted = (f.get("services") ?? input).split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter((s) => SERVICES[s]);
  const unknown = (f.get("services") ?? "").split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter((s) => s && !SERVICES[s]);
  if (!wanted.length) return { output: "", error: { message: `List services, e.g. "services: postgres, redis, kafka". Available: ${Object.keys(SERVICES).join(", ")}.` } };
  const project = (f.get("project") ?? "dev").toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const services: Obj = {};
  const volumes: Obj = {};
  const envFile: string[] = [];
  const val = (k: string, d: string) => { if (!options.envDefaults) return d; envFile.push(`${k}=${d}`); return `\${${k}:-${d}}`; };
  const values = new Map<string, string>();
  for (const name of [...new Set(wanted)]) {
    const d = SERVICES[name]!;
    const svc: Obj = { image: d.image };
    if (d.command) svc.command = d.command;
    if (d.env.length) svc.environment = Object.fromEntries(d.env.map(([k, v]) => { values.set(k, val(k, v)); return [k, /PASSWORD|PASS$|SECRET/.test(k) || /USER/.test(k) || k === "POSTGRES_DB" || k === "MYSQL_DATABASE" ? values.get(k)! : v]; }));
    svc.ports = d.ports;
    if (d.volume) { svc.volumes = [`${d.volume[0]}:${d.volume[1]}`]; volumes[d.volume[0]] = {}; }
    if (options.healthchecks && d.health) svc.healthcheck = { test: d.health, interval: "10s", timeout: "5s", retries: name === "oracle" ? 30 : 10, ...(name === "oracle" || name === "kafka" ? { start_period: name === "oracle" ? "120s" : "30s" } : {}) };
    services[name] = svc;
  }
  if (options.includeApp) {
    const v = (k: string) => values.get(k) ?? k;
    const appEnv = Object.fromEntries(wanted.flatMap((n) => SERVICES[n]!.appEnv?.(v) ?? []));
    services.app = {
      build: ".",
      ports: [`${f.get("app-port") ?? "8080"}:${f.get("app-port") ?? "8080"}`],
      ...(Object.keys(appEnv).length ? { environment: appEnv } : {}),
      depends_on: Object.fromEntries(wanted.map((n) => [n, { condition: options.healthchecks && SERVICES[n]!.health ? "service_healthy" : "service_started" }])),
    };
  }
  const doc: Obj = { name: project, services, ...(Object.keys(volumes).length ? { volumes } : {}) };
  const notes = wanted.map((n) => SERVICES[n]!.note).filter(Boolean) as string[];
  if (unknown.length) notes.unshift(`Not in the catalogue (skipped): ${unknown.join(", ")}.`);
  notes.push("Development credentials only. The ports are published on all interfaces; bind them to 127.0.0.1 (\"127.0.0.1:5432:5432\") on shared machines.");
  const parts = [`# compose.yaml${notes.length ? `\n${notes.map((n) => `# ${n}`).join("\n")}` : ""}\n${dump(doc, { lineWidth: -1, noRefs: true })}`];
  if (options.envDefaults && envFile.length) parts.push(`# .env (optional overrides; keep out of git)\n${[...new Set(envFile)].join("\n")}`);
  return { output: parts.join("\n"), error: null };
}
