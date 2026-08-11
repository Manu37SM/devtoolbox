import assert from "node:assert/strict";
import { test } from "node:test";
import { base64Decode, base64Encode, formatJson, jwtDecode, urlDecode, urlEncode } from "./transforms.ts";

test("formatJson pretty-prints valid JSON", () => {
  const result = formatJson('{"b":1,"a":2}');
  assert.equal(result.ok, true);
  assert.equal(result.output, '{\n  "b": 1,\n  "a": 2\n}');
});

test("formatJson reports invalid JSON without throwing", () => {
  const result = formatJson("{not json}");
  assert.equal(result.ok, false);
  assert.match(result.output, /Invalid JSON/);
});

test("base64Encode/base64Decode round-trip including non-ASCII", () => {
  const input = "hello devtoolbox — café";
  const encoded = base64Encode(input);
  assert.equal(encoded.ok, true);
  const decoded = base64Decode(encoded.output);
  assert.equal(decoded.ok, true);
  assert.equal(decoded.output, input);
});

test("base64Decode reports invalid input without throwing", () => {
  const result = base64Decode("not-valid-base64!!!");
  assert.equal(result.ok, false);
});

test("urlEncode/urlDecode round-trip", () => {
  const input = "a b&c=d";
  const encoded = urlEncode(input);
  assert.equal(encoded.ok, true);
  const decoded = urlDecode(encoded.output);
  assert.equal(decoded.ok, true);
  assert.equal(decoded.output, input);
});

test("urlDecode reports malformed sequences without throwing", () => {
  const result = urlDecode("%E0%A4%A");
  assert.equal(result.ok, false);
});

test("jwtDecode decodes header and payload and labels them unverified", () => {
  // { "alg": "HS256", "typ": "JWT" } . { "sub": "1234567890", "name": "John Doe" }
  const token =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.signature";
  const result = jwtDecode(token);
  assert.equal(result.ok, true);
  assert.match(result.output, /unverified/);
  assert.match(result.output, /"alg": "HS256"/);
  assert.match(result.output, /"sub": "1234567890"/);
});

test("jwtDecode rejects strings without a payload segment", () => {
  const result = jwtDecode("not-a-jwt");
  assert.equal(result.ok, false);
});
