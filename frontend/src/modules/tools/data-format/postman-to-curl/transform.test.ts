import { describe, expect, it } from "vitest";
import { runPostmanToCurl } from "./transform";
import type { PostmanToCurlOptions } from "./schema";

const base: PostmanToCurlOptions = { shell: "bash", variables: "resolve", maskSecrets: false };
const run = (doc: unknown, o: Partial<PostmanToCurlOptions> = {}) => runPostmanToCurl(JSON.stringify(doc), { ...base, ...o });

const COLLECTION = {
  info: { name: "Shop", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
  auth: { type: "bearer", bearer: [{ key: "token", value: "{{token}}", type: "string" }] },
  variable: [{ key: "baseUrl", value: "https://api.example.com" }, { key: "token", value: "abc123" }],
  item: [
    { name: "Orders", item: [
      { name: "List orders", request: { method: "GET", header: [{ key: "Accept", value: "application/json" }, { key: "X-Debug", value: "1", disabled: true }], url: { raw: "{{baseUrl}}/orders?page=1", host: ["{{baseUrl}}"], path: ["orders"] } } },
      { name: "Create order", request: { method: "POST", header: [], body: { mode: "raw", raw: "{\"sku\":\"A1\",\"note\":\"it's\"}", options: { raw: { language: "json" } } }, url: "{{baseUrl}}/orders" } },
    ] },
    { name: "Login", request: { auth: { type: "basic", basic: [{ key: "username", value: "ann" }, { key: "password", value: "pw" }] }, method: "POST", body: { mode: "urlencoded", urlencoded: [{ key: "grant_type", value: "client_credentials" }] }, url: "{{baseUrl}}/token" } },
    { name: "Upload", request: { auth: { type: "noauth" }, method: "POST", body: { mode: "formdata", formdata: [{ key: "file", type: "file", src: "/tmp/a.pdf" }, { key: "title", value: "A", type: "text" }] }, url: "{{baseUrl}}/files" } },
    { name: "Graph", request: { auth: { type: "apikey", apikey: [{ key: "key", value: "api_key" }, { key: "value", value: "k1" }, { key: "in", value: "query" }] }, method: "POST", body: { mode: "graphql", graphql: { query: "{ me { id } }", variables: "{\"a\":1}" } }, url: "{{baseUrl}}/graphql" } },
  ],
};

describe("runPostmanToCurl", () => {
  it("converts folders, inherited bearer auth and disabled headers", () => {
    const out = run(COLLECTION).output;
    expect(out).toContain("# Orders / List orders\ncurl 'https://api.example.com/orders?page=1' \\\n  -H 'Accept: application/json' \\\n  -H 'Authorization: Bearer abc123'");
    expect(out).not.toContain("X-Debug");
  });
  it("escapes single quotes in bodies and sets JSON content type", () => {
    expect(run(COLLECTION).output).toContain("curl -X POST 'https://api.example.com/orders' \\\n  -H 'Authorization: Bearer abc123' \\\n  -H 'Content-Type: application/json' \\\n  --data-raw '{\"sku\":\"A1\",\"note\":\"it'\\''s\"}'");
  });
  it("handles basic auth, urlencoded, formdata, noauth, apikey in query and GraphQL", () => {
    const out = run(COLLECTION).output;
    expect(out).toContain("-u 'ann:pw' \\\n  --data-urlencode 'grant_type=client_credentials'");
    expect(out).toContain("# Upload\ncurl -X POST 'https://api.example.com/files' \\\n  -F 'file=@/tmp/a.pdf' \\\n  -F 'title=A'");
    expect(out).toContain("curl -X POST 'https://api.example.com/graphql?api_key=k1'");
    expect(out).toContain(`--data-raw '{"query":"{ me { id } }","variables":{"a":1}}'`);
  });
  it("can emit environment variables, mask secrets and target PowerShell", () => {
    const env = run(COLLECTION, { variables: "env" }).output;
    expect(env).toContain('curl "${BASEURL}/orders?page=1"');
    expect(env).toContain('-H "Authorization: Bearer ${TOKEN}"');
    expect(run(COLLECTION, { maskSecrets: true }).output).toContain("-H 'Authorization: Bearer ********'");
    const ps = run(COLLECTION, { shell: "powershell" }).output;
    expect(ps).toContain("curl.exe -X POST 'https://api.example.com/orders' `\n  -H 'Authorization: Bearer abc123' `\n  -H 'Content-Type: application/json'");
    expect(ps).toContain(`'{"sku":"A1","note":"it''s"}'`);
  });
  it("reads undefined variables from the environment", () => {
    const out = run({ item: [{ name: "x", request: { method: "GET", url: "{{host}}/a" } }] }).output;
    expect(out).toContain("# Not defined in the collection, read from the environment: HOST");
    expect(out).toContain('curl "${HOST}/a"');
  });
  it("rejects non-collections", () => {
    expect(runPostmanToCurl("[]", base).error?.message).toContain("collection object");
    expect(runPostmanToCurl("{}", base).error?.message).toContain("No item array");
  });
});
