/* eslint-disable @typescript-eslint/no-explicit-any -- parsed YAML/AST shapes are asserted structurally in tests */
import { describe, expect, it } from "vitest";
import { loadAll } from "js-yaml";
import { cpu, memory, parseEnv, parsePort, runDockerComposeToKubernetes, shellWords } from "./transform";
import type { DockerComposeToKubernetesOptions } from "./schema";

const base: DockerComposeToKubernetesOptions = { serviceType: "ClusterIP", namespace: "", secretsFromEnv: true, includeProbes: true };
const run = (s: string, o: Partial<DockerComposeToKubernetesOptions> = {}) => runDockerComposeToKubernetes(s, { ...base, ...o });

const COMPOSE = `services:
  api:
    image: acme/api:1.4.2
    ports: ["8080:8080"]
    environment:
      SPRING_PROFILES_ACTIVE: prod
      DB_PASSWORD: s3cret
    command: ["--server.port=8080"]
    depends_on: [db]
    deploy:
      replicas: 2
      resources:
        limits: { cpus: "0.5", memory: 512M }
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8080/actuator/health || exit 1"]
      interval: 30s
      retries: 3
  db:
    image: postgres:17
    environment:
      - POSTGRES_PASSWORD=pg
      - POSTGRES_DB=app
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
volumes:
  pgdata: {}
`;

describe("helpers", () => {
  it("parses compose port syntaxes", () => {
    expect(parsePort("8080:80")).toEqual({ published: 8080, target: 80, protocol: "TCP" });
    expect(parsePort("127.0.0.1:5432:5432")).toEqual({ published: 5432, target: 5432, protocol: "TCP" });
    expect(parsePort("53/udp")).toEqual({ published: undefined, target: 53, protocol: "UDP" });
    expect(parsePort({ target: 80, published: 8000 })).toEqual({ target: 80, published: 8000, protocol: "TCP" });
    expect(parsePort("9000-9001:9000-9001")).toBeNull();
  });
  it("splits string commands like compose does", () => {
    expect(shellWords(`java -jar "my app.jar" --x='a b'`)).toEqual(["java", "-jar", "my app.jar", "--x=a b"]);
  });
  it("converts env and resource units", () => {
    expect(parseEnv(["A=1", "B=x=y", "C"])).toEqual([["A", "1"], ["B", "x=y"], ["C", ""]]);
    expect(parseEnv({ A: 1, B: null })).toEqual([["A", "1"], ["B", ""]]);
    expect(cpu("0.5")).toBe("500m");
    expect(cpu(2)).toBe("2");
    expect(memory("512M")).toBe("512Mi");
    expect(memory("1g")).toBe("1Gi");
  });
});

describe("runDockerComposeToKubernetes", () => {
  it("creates deployments, services, secrets and PVCs", () => {
    const out = run(COMPOSE, { namespace: "Shop" }).output;
    const docs = loadAll(out.split("\n").filter((l) => !l.startsWith("#")).join("\n")) as Record<string, any>[];
    expect(docs.map((d) => `${d.kind}/${d.metadata.name}`)).toEqual(["Deployment/api", "Service/api", "Secret/api-secrets", "Deployment/db", "Secret/db-secrets", "PersistentVolumeClaim/pgdata"]);
    const api = docs[0]!;
    expect(api.metadata.namespace).toBe("shop");
    expect(api.spec.replicas).toBe(2);
    const c = api.spec.template.spec.containers[0];
    expect(c.args).toEqual(["--server.port=8080"]);
    expect(c.resources).toEqual({ limits: { cpu: "500m", memory: "512Mi" } });
    expect(c.env).toEqual([{ name: "SPRING_PROFILES_ACTIVE", value: "prod" }, { name: "DB_PASSWORD", valueFrom: { secretKeyRef: { name: "api-secrets", key: "DB_PASSWORD" } } }]);
    expect(c.readinessProbe).toEqual({ exec: { command: ["sh", "-c", "curl -f http://localhost:8080/actuator/health || exit 1"] }, periodSeconds: 30, failureThreshold: 3 });
    expect(docs[1]!.spec.ports).toEqual([{ name: "tcp-8080", port: 8080, targetPort: 8080 }]);
    expect(docs[2]!.stringData).toEqual({ DB_PASSWORD: "s3cret" });
    expect(docs[3]!.spec.template.spec.volumes).toEqual([{ name: "pgdata", persistentVolumeClaim: { claimName: "pgdata" } }]);
    expect(out).toContain("# db: bind mount ./init.sql -> /docker-entrypoint-initdb.d/init.sql was skipped");
    expect(out).toContain("# api: depends_on has no Kubernetes equivalent");
    expect(out).toContain("# Secrets hold the values from your compose file in plain text");
  });
  it("keeps secrets inline when asked and honours the service type", () => {
    const out = run(COMPOSE, { secretsFromEnv: false, serviceType: "LoadBalancer" }).output;
    expect(out).not.toContain("kind: Secret");
    expect(out).toContain("type: LoadBalancer");
  });
  it("reports bad input", () => {
    expect(run("foo: [").error?.message).toContain("Invalid YAML");
    expect(run("version: '3'").error?.message).toContain("No services");
  });
});
