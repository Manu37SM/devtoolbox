import { describe, expect, it } from "vitest";
import { load } from "js-yaml";
import { flattenProps, generateSpringConfig } from "./transform";

const gen = (s: string, o = {}) => generateSpringConfig(s, { format: "yaml", profile: "default", ...o });
const IN = "app: orders\nport: 9090\ndb: oracle\ndb-host: db.internal\ndb-name: ORDERS\nfeatures: jpa, flyway, actuator";

describe("generateSpringConfig", () => {
  it("builds a valid, nested yaml", () => {
    const r = gen(IN);
    expect(r.error).toBeNull();
    const y = load(r.output) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(y.spring.application.name).toBe("orders");
    expect(y.server.port).toBe(9090);
    expect(y.spring.datasource.url).toBe("${DB_URL:jdbc:oracle:thin:@//db.internal:1521/ORDERS}");
    expect(y.spring.datasource.password).toBe("${DB_PASSWORD}");
    expect(y.spring.jpa.hibernate["ddl-auto"]).toBe("validate");
    expect(y.spring.flyway.locations).toBe("classpath:db/migration");
  });
  it("never writes a literal password", () => {
    expect(gen(IN).output).not.toMatch(/password:\s*(?!"?\$\{DB_PASSWORD\})\S/i);
    expect(gen(IN).output).toContain("# NOTE: The password is read from the DB_PASSWORD environment variable");
  });
  it("prod profile tightens defaults", () => {
    const o = gen(IN + ", openapi", { profile: "prod" }).output;
    expect(o.startsWith("# application-prod.yml\n")).toBe(true);
    const y = load(o) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(y.server.shutdown).toBe("graceful");
    expect(y.management.endpoints.web.exposure.include).toBe("health,info,prometheus");
    expect(y.springdoc["swagger-ui"].enabled).toBe(false);
    expect(y.spring.datasource.hikari["maximum-pool-size"]).toBe(20);
  });
  it("dev profile enables sql logging", () => {
    expect(gen("db: h2\nfeatures: jpa", { profile: "dev" }).output).toContain("show-sql: true");
  });
  it("properties output", () => {
    const o = gen("app: x\nport: 80\nfeatures: redis", { format: "properties" }).output;
    expect(o).toContain("spring.application.name=x\n");
    expect(o).toContain("spring.data.redis.host=${REDIS_HOST:localhost}\n");
    expect(flattenProps({ a: { b: [1, { c: 2 }] } })).toEqual([["a.b[0]", "1"], ["a.b[1].c", "2"]]);
  });
  it("oauth2 needs an issuer; unknown things are rejected", () => {
    expect(gen("features: oauth2-resource-server").error?.message).toMatch(/issuer/);
    expect(gen("features: oauth2-resource-server\nissuer: https://id.example.com/realms/x").output).toContain("issuer-uri: https://id.example.com/realms/x");
    expect(gen("features: nope").error?.message).toMatch(/Unknown feature/);
    expect(gen("db: mongo").error?.message).toMatch(/Unknown db/);
    expect(gen("features: jpa").error?.message).toMatch(/db:/);
    expect(gen("port: 99999").error?.message).toMatch(/port/);
    expect(gen("")).toEqual({ output: "", error: null });
  });
});
