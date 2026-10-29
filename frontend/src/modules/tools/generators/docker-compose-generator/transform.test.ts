/* eslint-disable @typescript-eslint/no-explicit-any -- parsed YAML/AST shapes are asserted structurally in tests */
import { describe, expect, it } from "vitest";
import { load } from "js-yaml";
import { runDockerComposeGenerator, SERVICES } from "./transform";

const compose = (out: string) => load(out.split("# .env")[0]!) as Record<string, any>;

describe("runDockerComposeGenerator", () => {
  it("builds services with healthchecks, volumes and an app wired to them", () => {
    const out = runDockerComposeGenerator("project: Shop\nservices: postgres, redis, kafka, nope", { healthchecks: true, includeApp: true, envDefaults: true }).output;
    const doc = compose(out);
    expect(doc.name).toBe("shop");
    expect(Object.keys(doc.services)).toEqual(["postgres", "redis", "kafka", "app"]);
    expect(doc.services.postgres.environment.POSTGRES_PASSWORD).toBe("${POSTGRES_PASSWORD:-app}");
    expect(doc.services.postgres.healthcheck.test).toEqual(["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]);
    expect(doc.volumes).toEqual({ pgdata: {}, redisdata: {} });
    expect(doc.services.app.depends_on).toEqual({ postgres: { condition: "service_healthy" }, redis: { condition: "service_healthy" }, kafka: { condition: "service_healthy" } });
    expect(doc.services.app.environment.SPRING_DATASOURCE_PASSWORD).toBe("${POSTGRES_PASSWORD:-app}");
    expect(doc.services.app.environment.SPRING_KAFKA_BOOTSTRAP_SERVERS).toBe("kafka:29092");
    expect(out).toContain("# Not in the catalogue (skipped): nope.");
    expect(out).toContain("# .env (optional overrides; keep out of git)\nPOSTGRES_USER=app");
  });
  it("uses plain values without env defaults and plain depends_on without healthchecks", () => {
    const doc = compose(runDockerComposeGenerator("services: oracle mailpit", { healthchecks: false, includeApp: true, envDefaults: false }).output);
    expect(doc.services.oracle.environment.APP_USER_PASSWORD).toBe("app");
    expect(doc.services.oracle.healthcheck).toBeUndefined();
    expect(doc.services.app.depends_on.oracle.condition).toBe("service_started");
    expect(doc.services.app.environment.SPRING_DATASOURCE_URL).toBe("jdbc:oracle:thin:@//oracle:1521/FREEPDB1");
  });
  it("pins every image to a version", () => {
    for (const [name, d] of Object.entries(SERVICES)) expect(d.image, name).toMatch(/:[\w.-]+$/);
    for (const [name, d] of Object.entries(SERVICES)) expect(d.image, name).not.toMatch(/:latest$/);
  });
  it("requires at least one known service", () => {
    expect(runDockerComposeGenerator("services: unicorn", { healthchecks: true, includeApp: true, envDefaults: true }).error?.message).toContain("Available: postgres");
  });
});
