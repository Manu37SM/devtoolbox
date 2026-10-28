import { describe, expect, it } from "vitest";
import { load } from "js-yaml";
import { generateKong, pluginConfig } from "./transform";

const gen = (s: string, format: "declarative" | "admin-api" = "declarative") => generateKong(s, { format });
const IN = "service: orders\nurl: http://orders.internal:8080\nroute: /orders, /v1/orders\nmethods: get, post\nplugins: rate-limiting, key-auth\nrate: 100/minute";

describe("declarative", () => {
  it("builds a valid kong.yml structure", () => {
    const r = gen(IN);
    expect(r.error).toBeNull();
    const y = load(r.output) as { _format_version: string; services: Array<Record<string, unknown>> };
    expect(y._format_version).toBe("3.0");
    expect(y.services[0]).toEqual({
      name: "orders", url: "http://orders.internal:8080",
      routes: [{ name: "orders-route", paths: ["/orders", "/v1/orders"], methods: ["GET", "POST"], strip_path: true }],
      plugins: [{ name: "rate-limiting", config: { minute: 100, policy: "local" } }, { name: "key-auth", config: { key_names: ["apikey"] } }],
    });
  });
  it("supports multiple services separated by ---", () => {
    const y = load(gen(`${IN}\n---\nservice: users\nurl: https://users.svc`).output) as { services: unknown[] };
    expect(y.services).toHaveLength(2);
  });
  it("strip_path false", () => {
    expect(gen("service: a\nurl: http://a\nstrip_path: false").output).toContain("strip_path: false");
  });
});

describe("admin api", () => {
  it("emits curl commands", () => {
    const o = gen(IN, "admin-api").output;
    expect(o).toContain("curl -sS -X POST http://localhost:8001/services -d name=orders -d url=http://orders.internal:8080");
    expect(o).toContain("-d name=rate-limiting -d config.minute=100 -d config.policy=local");
  });
});

describe("validation", () => {
  it("reports specific problems", () => {
    expect(gen("url: http://a").error?.message).toMatch(/missing service/);
    expect(gen("service: a\nurl: ftp://x").error?.message).toMatch(/url/);
    expect(gen("service: a\nurl: http://a\nroute: orders").error?.message).toMatch(/start with/);
    expect(gen("service: a\nurl: http://a\nplugins: nope").error?.message).toMatch(/Unknown plugin/);
    expect(gen("service: a\nurl: http://a\nplugins: rate-limiting\nrate: lots").error?.message).toMatch(/rate must/);
    expect(gen("service: a\nurl: http://a\nplugins: ip-restriction").error?.message).toMatch(/allow/);
    expect(pluginConfig("acl", {})).toMatch(/groups/);
    expect(gen("")).toEqual({ output: "", error: null });
  });
});
