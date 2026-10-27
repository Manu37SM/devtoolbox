import { describe, expect, it } from "vitest";
import { convertCurl, generateAxios, generateFetch, generatePython, parseCurl, tokenize } from "./transform";

describe("tokenize", () => {
  it("handles single, double and ANSI-C quotes", () => {
    expect(tokenize(`curl -H 'A: b c' -d "x \\"y\\"" $'l1\\nl2'`)).toEqual(["curl", "-H", "A: b c", "-d", 'x "y"', "l1\nl2"]);
  });

  it("joins line continuations and adjacent quoted segments", () => {
    expect(tokenize("curl \\\n  -X POST \\\n  'http://a'\"b\"")).toEqual(["curl", "-X", "POST", "http://ab"]);
  });

  it("throws on unterminated quotes", () => {
    expect(() => tokenize("curl 'oops")).toThrow();
    expect(() => tokenize('curl "oops')).toThrow();
  });
});

describe("parseCurl", () => {
  it("defaults to GET, and POST when a body is present", () => {
    expect(parseCurl("curl https://a.test").method).toBe("GET");
    expect(parseCurl("curl -d x=1 https://a.test").method).toBe("POST");
    expect(parseCurl("curl -I https://a.test").method).toBe("HEAD");
  });

  it("lets -X override and supports attached/equals forms", () => {
    expect(parseCurl("curl -XPUT https://a.test").method).toBe("PUT");
    expect(parseCurl("curl --request=DELETE https://a.test").method).toBe("DELETE");
  });

  it("parses headers, replacing duplicates case-insensitively", () => {
    const p = parseCurl("curl -H 'Accept: a' -H 'accept: b' -H 'X-Id:5' https://a.test");
    expect(p.headers).toEqual([["accept", "b"], ["X-Id", "5"]]);
  });

  it("ignores bundled boolean flags and unknown flags", () => {
    const p = parseCurl("curl -sSL --compressed -k https://a.test");
    expect(p.url).toBe("https://a.test");
    expect(p.method).toBe("GET");
  });

  it("concatenates -d values with & and defaults the content type", () => {
    const p = parseCurl("curl -d a=1 -d b=2 https://a.test");
    expect(p.body).toBe("a=1&b=2");
    expect(p.headers).toContainEqual(["Content-Type", "application/x-www-form-urlencoded"]);
  });

  it("moves data into the query string with -G", () => {
    const p = parseCurl("curl -G -d q=1 https://a.test/s");
    expect(p).toMatchObject({ url: "https://a.test/s?q=1", body: null, method: "GET" });
  });

  it("expands --json", () => {
    const p = parseCurl(`curl --json '{"a":1}' https://a.test`);
    expect(p.method).toBe("POST");
    expect(p.headers).toContainEqual(["Content-Type", "application/json"]);
  });

  it("maps -u, -A, -b and -e", () => {
    const p = parseCurl("curl -u me:pw -A bot -b 's=1' -e http://r.test https://a.test");
    expect(p.basicAuth).toBe("me:pw");
    expect(p.headers).toEqual([["User-Agent", "bot"], ["Cookie", "s=1"], ["Referer", "http://r.test"]]);
  });

  it("reports unsupported and malformed input", () => {
    expect(() => parseCurl("wget https://a.test")).toThrow(/curl/);
    expect(() => parseCurl("curl -F file=@a.png https://a.test")).toThrow(/Multipart/);
    expect(() => parseCurl("curl -H nocolon https://a.test")).toThrow(/Invalid header/);
    expect(() => parseCurl("curl -X")).toThrow(/expects a value/);
    expect(() => parseCurl("curl -s")).toThrow(/No URL/);
    expect(() => parseCurl("curl https://a.test https://b.test")).toThrow(/Multiple/);
  });
});

const jsonCurl = `curl -X POST https://api.test/items -H 'Content-Type: application/json' -d '{"name":"x","tags":["a"],"ok":true,"n":null}'`;

describe("generators", () => {
  it("fetch: plain GET has no options object", () => {
    expect(generateFetch(parseCurl("curl https://a.test"))).toBe(
      'const response = await fetch("https://a.test");\nconst data = await response.text();\n',
    );
  });

  it("fetch: JSON bodies become JSON.stringify(…)", () => {
    const out = generateFetch(parseCurl(jsonCurl));
    expect(out).toContain('method: "POST"');
    expect(out).toContain('"Content-Type": "application/json"');
    expect(out).toContain("body: JSON.stringify({");
    expect(out).toContain('"tags": [');
  });

  it("fetch: non-JSON bodies stay as escaped strings", () => {
    expect(generateFetch(parseCurl(`curl -d 'a=1&b="2"' https://a.test`))).toContain('body: "a=1&b=\\"2\\""');
  });

  it("fetch/axios: basic auth becomes a computed header", () => {
    expect(generateFetch(parseCurl("curl -u me:pw https://a.test"))).toContain('"Authorization": "Basic " + btoa("me:pw")');
    expect(generateAxios(parseCurl("curl -u me:pw https://a.test"))).toContain('"Authorization": "Basic " + btoa("me:pw")');
  });

  it("axios: emits method, url and data", () => {
    const out = generateAxios(parseCurl(jsonCurl));
    expect(out).toContain('method: "post"');
    expect(out).toContain('url: "https://api.test/items"');
    expect(out).toContain("data: {");
  });

  it("python: uses Python literals and the json= argument", () => {
    const out = generatePython(parseCurl(jsonCurl));
    expect(out).toContain("json={");
    expect(out).toContain('"ok": True');
    expect(out).toContain('"n": None');
    expect(out).not.toContain("true");
  });

  it("python: basic auth becomes auth=(user, pass)", () => {
    expect(generatePython(parseCurl("curl -u me:pw https://a.test"))).toContain('auth=("me", "pw")');
  });
});

describe("convertCurl", () => {
  it("returns errors as values", () => {
    expect(convertCurl("curl", { target: "fetch" }).error).not.toBeNull();
  });

  it("returns empty output for blank input", () => {
    expect(convertCurl("  ", { target: "fetch" })).toEqual({ output: "", error: null });
  });

  it("dispatches on the selected target", () => {
    expect(convertCurl("curl https://a.test", { target: "axios" }).output).toContain("axios");
    expect(convertCurl("curl https://a.test", { target: "python" }).output).toContain("import requests");
  });
});
