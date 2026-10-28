import { describe, expect, it } from "vitest";
import { lintSpec, listOperations, parseSpec, viewOpenapi } from "./transform";

const SPEC = {
  openapi: "3.0.3",
  info: { title: "Pet Store", version: "1.2.0", description: "A sample API.\nSecond line." },
  servers: [{ url: "https://api.example.com/v1", description: "prod" }],
  security: [{ oauth: [] }],
  tags: [{ name: "pets" }],
  paths: {
    "/pets": {
      get: { tags: ["pets"], operationId: "listPets", summary: "List pets", responses: { "200": { description: "ok" }, "400": { description: "bad" } } },
      post: { tags: ["pets"], operationId: "createPet", summary: "Create", requestBody: { content: {} }, responses: { "201": { description: "created" } } },
    },
    "/pets/{petId}": {
      parameters: [{ name: "petId", in: "path", required: true, schema: { type: "string" } }],
      get: { tags: ["pets"], operationId: "getPet", security: [], responses: { "200": { description: "ok" }, default: { description: "err" } } },
      delete: { operationId: "getPet", deprecated: true, responses: { "204": { description: "gone" }, "404": { description: "nf" } } },
    },
    "/Orders/{id}/": { get: { responses: { "200": { description: "ok" } } } },
  },
  components: {
    securitySchemes: { oauth: { type: "oauth2", flows: { authorizationCode: {} } } },
    schemas: { Pet: { type: "object", required: ["id"], properties: { id: { type: "integer", format: "int64" }, owner: { $ref: "#/components/schemas/Owner" } } } },
  },
};
const json = JSON.stringify(SPEC);
const all = { view: "all" } as const;

describe("parseSpec", () => {
  it("accepts JSON, YAML and Swagger 2.0", () => {
    expect(parseSpec(json).openapi).toBe("3.0.3");
    expect(parseSpec("openapi: 3.1.0\ninfo: {title: t, version: '1'}\npaths: {}").openapi).toBe("3.1.0");
    expect(parseSpec('{"swagger":"2.0","paths":{}}').swagger).toBe("2.0");
  });
  it("rejects non-OpenAPI documents with useful messages", () => {
    expect(() => parseSpec("{")).toThrow(/Not valid JSON or YAML|object/);
    expect(() => parseSpec("[1]")).toThrow(/object/);
    expect(() => parseSpec('{"openapi":"2.5","paths":{}}')).toThrow(/Not an OpenAPI/);
    expect(() => parseSpec('{"openapi":"3.0.0"}')).toThrow(/no "paths"/);
  });
});

describe("listOperations", () => {
  it("merges path-level parameters into operations", () => {
    const ops = listOperations(SPEC as never);
    expect(ops).toHaveLength(5);
    expect(ops.find((o) => o.method === "get" && o.path === "/pets/{petId}")!.params.map((p) => p.name)).toEqual(["petId"]);
  });
});

describe("viewOpenapi", () => {
  it("summarises the API", () => {
    const out = viewOpenapi(json, all).output;
    expect(out).toContain("Pet Store  v1.2.0");
    expect(out).toContain("5 operations");
    expect(out).toContain("Server   https://api.example.com/v1  (prod)");
    expect(out).toContain("Auth     oauth: oauth2 flows: authorizationCode");
    expect(out).toContain("Methods  GET 3 · POST 1 · DELETE 1");
    expect(out).toContain("Deprecated operations: 1");
  });
  it("lists endpoints by tag with auth and responses", () => {
    const out = viewOpenapi(json, { view: "endpoints" }).output;
    expect(out).toContain("▸ pets (3)");
    expect(out).toMatch(/GET\s+\/pets\n\s+List pets {2}·{1} {2}auth: oauth {2}· {2}→ 200,400/);
    expect(out).toMatch(/GET\s+\/pets\/\{petId\}\n\s+public/);
    expect(out).toContain("[deprecated]");
    expect(out).toContain("▸ (untagged) (2)");
  });
  it("describes schemas with required markers and refs", () => {
    const out = viewOpenapi(json, { view: "schemas" }).output;
    expect(out).toContain("Pet  (object, 2 properties)");
    expect(out).toContain("id*  integer:int64");
    expect(out).toContain("owner  Owner");
  });
  it("errors cleanly on bad input and ignores empty input", () => {
    expect(viewOpenapi("nope: 1", all).error).not.toBeNull();
    expect(viewOpenapi(" ", all)).toEqual({ output: "", error: null });
  });
});

describe("lintSpec", () => {
  const f = lintSpec(SPEC as never);
  const has = (level: string, re: RegExp) => f.some((x) => x.level === level && re.test(`${x.where}: ${x.text}`));
  it("catches duplicate operationIds and missing ones", () => {
    expect(has("error", /DELETE \/pets\/\{petId\}: Duplicate operationId "getPet"/)).toBe(true);
    expect(has("warn", /GET \/Orders\/\{id\}\/: No operationId/)).toBe(true);
  });
  it("catches undeclared path parameters", () => {
    expect(has("error", /\/Orders\/\{id\}\/: Path parameter \{id\} is not declared/)).toBe(true);
    const bad = lintSpec({ openapi: "3.0.0", paths: { "/a": { get: { parameters: [{ name: "x", in: "path" }], responses: { "200": {} } } } } });
    expect(bad.some((x) => /Declared path parameter "x"/.test(x.text))).toBe(true);
  });
  it("does not false-positive on parameters declared via $ref", () => {
    const spec = { openapi: "3.0.0", components: { parameters: { Id: { name: "id", in: "path", required: true } } }, paths: { "/a/{id}": { get: { parameters: [{ $ref: "#/components/parameters/Id" }], responses: { "200": {}, "404": {} } } } } };
    expect(lintSpec(spec as never).filter((x) => x.level === "error")).toEqual([]);
    const unresolved = { openapi: "3.0.0", paths: { "/a/{id}": { get: { parameters: [{ $ref: "https://x/y.yaml#/p" }], responses: { "200": {}, "404": {} } } } } };
    expect(lintSpec(unresolved as never).filter((x) => x.level === "error")).toEqual([]);
  });
  it("checks responses, GET bodies and security coverage", () => {
    expect(has("warn", /POST \/pets: No 4xx\/5xx or default/)).toBe(true);
    expect(has("warn", /GET \/Orders\/\{id\}\/: No 4xx/)).toBe(true);
    const spec = { openapi: "3.0.0", components: { securitySchemes: { k: { type: "apiKey" } } }, paths: { "/a": { get: { requestBody: {}, responses: { "200": {}, "400": {} } } } } };
    const g = lintSpec(spec as never);
    expect(g.some((x) => /GET with a request body/.test(x.text))).toBe(true);
    expect(g.some((x) => /no security requirement/.test(x.text))).toBe(true);
    expect(has("warn", /no security requirement/)).toBe(false); // global security covers the main SPEC
  });
  it("flags path style issues as info", () => {
    expect(has("info", /Trailing slash/)).toBe(true);
    expect(has("info", /Uppercase characters/)).toBe(true);
    const verb = lintSpec({ openapi: "3.0.0", paths: { "/getUsers": { get: { responses: { "200": {}, "400": {} } } } } });
    expect(verb.some((x) => /looks like a verb/.test(x.text))).toBe(true);
  });
  it("is quiet on a tidy spec and sorts errors first in the view", () => {
    const tidy = { openapi: "3.0.0", servers: [{ url: "/" }], paths: { "/users": { get: { operationId: "listUsers", summary: "x", responses: { "200": {}, "400": {} } } } } };
    expect(lintSpec(tidy as never)).toEqual([]);
    expect(viewOpenapi(JSON.stringify(tidy), { view: "lint" }).output).toBe("LINT — no findings");
    const lintOut = viewOpenapi(json, { view: "lint" }).output;
    expect(lintOut.indexOf("✗")).toBeLessThan(lintOut.indexOf("!"));
    expect(lintOut.indexOf("!")).toBeLessThan(lintOut.indexOf("·"));
  });
});
