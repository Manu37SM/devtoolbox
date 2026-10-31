import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { EXAMPLE_NONCE, parseSoap, passwordDigest, soapEnvelopeBuilder } from "./transform";

const build = (input: unknown, o: Parameters<typeof soapEnvelopeBuilder>[1] = {}) => {
  const r = soapEnvelopeBuilder(typeof input === "string" ? input : JSON.stringify(input), o);
  if (r.error) throw new Error(r.error.message);
  return r.output;
};
const REQ = { GetQuote: { symbol: "ACME", "@_currency": "USD" } };

describe("build", () => {
  it("SOAP 1.1 envelope with prefixed operation, unqualified children", () => {
    const x = build(REQ);
    expect(x).toContain('<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">');
    expect(x).toContain('<ns:GetQuote xmlns:ns="http://example.com/service" currency="USD">');
    expect(x).toContain("<symbol>ACME</symbol>");
    expect(x).not.toContain("<soapenv:Header>");
    expect(x.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });
  it("SOAP 1.2 and qualified children", () => {
    const x = build(REQ, { version: "1.2", childForm: "qualified" });
    expect(x).toContain("http://www.w3.org/2003/05/soap-envelope");
    expect(x).toContain("<ns:symbol>ACME</ns:symbol>");
  });
  it("default namespace when prefix is empty", () => {
    const x = build(REQ, { prefix: "" });
    expect(x).toContain('<GetQuote xmlns="http://example.com/service"');
  });
  it("escapes text and attributes; arrays repeat elements", () => {
    const x = build({ Op: { a: "x < y & z", item: [{ id: 1 }, { id: 2 }] } });
    expect(x).toContain("x &lt; y &amp; z");
    expect(x.match(/<item>/g)).toHaveLength(2);
  });
  it("custom headers", () => {
    const x = build(REQ, { headers: '{"TraceId":"abc-123"}' });
    expect(x).toContain("<soapenv:Header>");
    expect(x).toContain("<ns:TraceId");
    expect(x).toContain("abc-123");
  });
  it("no declaration, minified", () => {
    const x = build(REQ, { xmlDeclaration: false, indent: 0 });
    expect(x.startsWith("<soapenv:Envelope")).toBe(true);
    expect(x).not.toContain("\n");
  });
  it("validates", () => {
    expect(soapEnvelopeBuilder("[1]").error?.message).toMatch(/JSON object/);
    expect(soapEnvelopeBuilder("{}").error?.message).toMatch(/top-level key/);
    expect(soapEnvelopeBuilder("{bad").error?.message).toMatch(/must be JSON/);
    expect(soapEnvelopeBuilder('{"a b": 1}').error?.message).toMatch(/not a valid XML element name/);
    expect(soapEnvelopeBuilder('{"Op":{}}', { security: "text" }).error?.message).toMatch(/username/);
    expect(soapEnvelopeBuilder('{"Op":{}}', { headers: "{x" }).error?.message).toMatch(/Header JSON/);
    expect(soapEnvelopeBuilder('{"Op":{}}', { output: "http", endpoint: "nope" }).error?.message).toMatch(/not a valid URL/);
    expect(soapEnvelopeBuilder("").output).toBe("");
  });
});

describe("WS-Security UsernameToken", () => {
  const o = { security: "digest", username: "bob", password: "s3cret", nonce: EXAMPLE_NONCE, created: "2024-05-01T10:00:00Z" } as const;
  it("password digest matches independent SHA-1", () => {
    const py = spawnSync("python3", ["-c", "import hashlib,base64;print(base64.b64encode(hashlib.sha1(base64.b64decode('WScqanjCEAC4mQoBE07sAQ==')+b'2024-05-01T10:00:00Z'+b's3cret').digest()).decode())"], { encoding: "utf8" });
    if (py.status === 0) expect(passwordDigest(EXAMPLE_NONCE, "2024-05-01T10:00:00Z", "s3cret")).toBe(py.stdout.trim());
    // known value computed with hashlib at authoring time
    expect(passwordDigest("WScqanjCEAC4mQoBE07sAQ==", "2003-07-16T01:24:32Z", "taadtaadpstcsm")).toBe("AtYMdWClJo7PIuTpqmhmEEoEZyc=");
  });
  it("non-ASCII passwords are hashed as UTF-8", () => {
    const py = spawnSync("python3", ["-c", "import hashlib,base64;print(base64.b64encode(hashlib.sha1(base64.b64decode('WScqanjCEAC4mQoBE07sAQ==')+'2024-05-01T10:00:00Zpässwörd€'.encode()).digest()).decode())"], { encoding: "utf8" });
    if (py.status === 0) expect(passwordDigest(EXAMPLE_NONCE, "2024-05-01T10:00:00Z", "pässwörd€")).toBe(py.stdout.trim());
  });
  it("digest header", () => {
    const x = build(REQ, o);
    expect(x).toContain("<wsse:Security");
    expect(x).toContain('soapenv:mustUnderstand="1"');
    expect(x).toContain("#PasswordDigest");
    expect(x).toContain("<wsu:Created>2024-05-01T10:00:00Z</wsu:Created>");
    expect(x).toContain(passwordDigest(EXAMPLE_NONCE, "2024-05-01T10:00:00Z", "s3cret"));
    expect(x).not.toContain("s3cret");
  });
  it("text password and mustUnderstand off / SOAP 1.2", () => {
    const x = build(REQ, { security: "text", username: "bob", password: "s3cret", mustUnderstand: false, version: "1.2" });
    expect(x).toContain("#PasswordText");
    expect(x).toContain(">s3cret</wsse:Password>");
    expect(x).not.toContain("mustUnderstand");
    const y = build(REQ, { security: "text", username: "bob", password: "x", version: "1.2" });
    expect(y).toContain('soapenv:mustUnderstand="true"');
  });
  it("escapes credentials", () => {
    expect(build(REQ, { security: "text", username: "a<b", password: "p&q" })).toContain("a&lt;b");
  });
});

describe("faults", () => {
  it("1.1", () => {
    const x = build({ code: "Client", reason: "Bad symbol", actor: "urn:svc", detail: { errorCode: 42 } }, { mode: "fault" });
    expect(x).toContain("<soapenv:Fault>");
    expect(x).toContain("<faultcode>soapenv:Client</faultcode>");
    expect(x).toContain("<faultstring>Bad symbol</faultstring>");
    expect(x).toContain("<faultactor>urn:svc</faultactor>");
    expect(x).toContain("<errorCode>42</errorCode>");
  });
  it("1.2 maps Client→Sender and adds subcode / lang", () => {
    const x = build({ code: "Client", reason: "Bad", subcode: "ns:Invalid", lang: "fr" }, { mode: "fault", version: "1.2" });
    expect(x).toContain("<soapenv:Value>soapenv:Sender</soapenv:Value>");
    expect(x).toContain("<soapenv:Subcode>");
    expect(x).toContain('xml:lang="fr"');
  });
  it("requires a reason", () => {
    expect(soapEnvelopeBuilder("{}", { mode: "fault" }).error?.message).toMatch(/reason/);
  });
});

describe("http / curl output", () => {
  it("1.1 http has SOAPAction and correct Content-Length", () => {
    const out = build(REQ, { output: "http", soapAction: "urn:GetQuote", endpoint: "https://api.test/svc?wsdl" });
    expect(out).toMatch(/^POST \/svc\?wsdl HTTP\/1\.1\nHost: api\.test\nContent-Type: text\/xml; charset=utf-8/);
    expect(out).toContain('SOAPAction: "urn:GetQuote"');
    const body = out.split("\n\n").slice(1).join("\n\n");
    expect(out).toContain(`Content-Length: ${new TextEncoder().encode(body).length}`);
  });
  it("1.2 puts the action in Content-Type", () => {
    const out = build(REQ, { output: "http", version: "1.2", soapAction: "urn:GetQuote" });
    expect(out).toContain('Content-Type: application/soap+xml; charset=utf-8; action="urn:GetQuote"');
    expect(out).not.toContain("SOAPAction:");
  });
  it("curl quotes safely", () => {
    const out = build({ Op: { n: "it's" } }, { output: "curl" });
    expect(out).toContain("curl -X POST 'https://example.com/service'");
    expect(out).toContain("it'\\''s");
  });
});

describe("parse", () => {
  const resp = `<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Header><h:Trace xmlns:h="urn:h" s:mustUnderstand="1">t1</h:Trace></s:Header><s:Body><q:GetQuoteResponse xmlns:q="urn:q"><q:price>12.5</q:price></q:GetQuoteResponse></s:Body></s:Envelope>`;
  it("response", () => {
    const j = parseSoap(resp) as Record<string, unknown>;
    expect(j.version).toBe("1.1");
    expect(j.operation).toBe("GetQuoteResponse");
    expect(j.operationNamespace).toBe("urn:q");
    expect(j.body).toEqual({ price: "12.5" });
    expect(j.headers).toEqual({ Trace: { "#text": "t1", "@_mustUnderstand": "1" } });
    expect(j.mustUnderstand).toEqual(["Trace"]);
  });
  it("fault round trip", () => {
    const f = build({ code: "Server", reason: "boom", detail: { code: 7 } }, { mode: "fault", version: "1.2" });
    const j = parseSoap(f) as { version: string; fault: Record<string, unknown> };
    expect(j.version).toBe("1.2");
    expect(JSON.stringify(j.fault)).toContain("boom");
  });
  it("build → parse round trip", () => {
    const j = parseSoap(build(REQ)) as { operation: string; body: Record<string, string> };
    expect(j.operation).toBe("GetQuote");
    expect(j.body.symbol).toBe("ACME");
    expect(j.body["@_currency"]).toBe("USD");
  });
  it("errors", () => {
    expect(soapEnvelopeBuilder("<a/>", { mode: "parse" }).error?.message).toMatch(/expected a SOAP Envelope/);
    expect(soapEnvelopeBuilder('<e:Envelope xmlns:e="x"><e:Header/></e:Envelope>', { mode: "parse" }).error?.message).toMatch(/No <Body>/);
  });
});

// ---- oracle: xmllint must accept every generated envelope (well-formed + namespaces bound) ----
const hasXmllint = spawnSync("xmllint", ["--version"], { encoding: "utf8" }).status === 0; // absent binary => status null => skipped
describe.skipIf(!hasXmllint)("xmllint oracle", () => {
  const lint = (xml: string) => spawnSync("xmllint", ["--noout", "-"], { input: xml, encoding: "utf8" });
  it("accepts every combination", () => {
    const secs = ["none", "text", "digest"] as const;
    for (const version of ["1.1", "1.2"] as const)
      for (const childForm of ["unqualified", "qualified"] as const)
        for (const security of secs) {
          const x = build({ Transfer: { from: { acct: "A<1>", "@_id": "x" }, amount: "10.50", tags: ["a", "b"] } }, { version, childForm, security, username: "u", password: "p&p", headers: '{"Trace":{"id":"1"}}', created: "2024-01-01T00:00:00Z" });
          const r = lint(x);
          expect(r.stderr, `${version}/${childForm}/${security}`).toBe("");
          expect(r.status).toBe(0);
        }
    for (const version of ["1.1", "1.2"] as const) {
      const f = build({ code: "Server", reason: "x & y", subcode: "ns:Sub", detail: { a: 1 } }, { mode: "fault", version });
      expect(lint(f).stderr).toBe("");
    }
  });
  it("xmllint reports the root namespace we generate", () => {
    const r = spawnSync("xmllint", ["--xpath", "namespace-uri(/*)", "-"], { input: build(REQ, { version: "1.2" }), encoding: "utf8" });
    expect(r.stdout.trim()).toBe("http://www.w3.org/2003/05/soap-envelope");
  });
});
