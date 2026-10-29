import { describe, expect, it } from "vitest";
import { canonicalQuery, canonicalUri, parseFields, runAwsSigv4Calculator, sign, signingKey, uriEncode } from "./transform";

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

describe("AWS documentation examples", () => {
  it("derives the documented signing key", async () => {
    expect(hex(await signingKey("wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY", "20150830", "us-east-1", "iam"))).toBe("c4afb1cc5771d871763a393e44b703571b55cc28424d1a5e86da6ed3c154a4b9");
  });
  it("signs the IAM ListUsers request", async () => {
    const f = parseFields(`method: GET
url: https://iam.amazonaws.com/?Action=ListUsers&Version=2010-05-08
region: us-east-1
service: iam
access-key: AKIDEXAMPLE
secret-key: wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY
date: 20150830T123600Z
header: Content-Type: application/x-www-form-urlencoded; charset=utf-8`);
    const r = await sign(f, "header", false);
    expect(r.canonicalRequest).toBe("GET\n/\nAction=ListUsers&Version=2010-05-08\ncontent-type:application/x-www-form-urlencoded; charset=utf-8\nhost:iam.amazonaws.com\nx-amz-date:20150830T123600Z\n\ncontent-type;host;x-amz-date\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(r.stringToSign.split("\n").pop()).toBe("f536975d06c0309214f805bb90ccff089219ecd68b2577efef23edd43b7e1a59");
    expect(r.signature).toBe("5d672d79c15b13162d9279b0855cfba6789a8edb4c82c400e06b5924a6f2b5d7");
  });
  it("builds the S3 presigned URL example", async () => {
    const f = parseFields(`url: https://examplebucket.s3.amazonaws.com/test.txt
region: us-east-1
service: s3
access-key: AKIAIOSFODNN7EXAMPLE
secret-key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
date: 20130524T000000Z
expires: 86400`);
    const r = await sign(f, "presigned", false);
    expect(r.signature).toBe("aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404");
    expect(r.presignedUrl).toBe("https://examplebucket.s3.amazonaws.com/test.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20130524T000000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host&X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404");
  });
});

describe("canonicalisation", () => {
  it("encodes per RFC 3986 and sorts query params", () => {
    expect(uriEncode("a b/c~")).toBe("a%20b%2Fc~");
    expect(canonicalQuery([["b", "2"], ["a", "x y"], ["a", "1"]])).toBe("a=1&a=x%20y&b=2");
  });
  it("double-encodes paths except for S3", () => {
    expect(canonicalUri("/my%20file", "execute-api")).toBe("/my%2520file");
    expect(canonicalUri("/my%20file", "s3")).toBe("/my%20file");
    expect(canonicalUri("", "s3")).toBe("/");
  });
});

describe("runAwsSigv4Calculator", () => {
  const base = "url: https://abc.execute-api.ap-south-1.amazonaws.com/prod/orders\nmethod: POST\nregion: ap-south-1\nservice: execute-api\naccess-key: AKID\nsecret-key: SECRET\nsession-token: TOKEN\ndate: 20240131T100000Z\nheader: Content-Type: application/json\n\n{\"a\":1}";
  it("adds session token headers and a curl command", async () => {
    const out = (await runAwsSigv4Calculator(base, { mode: "header", unsignedPayload: false, showSteps: true })).output;
    expect(out).toContain("SignedHeaders=content-type;host;x-amz-date;x-amz-security-token");
    expect(out).toContain("X-Amz-Security-Token: TOKEN");
    expect(out).toContain("--data-raw '{\"a\":1}'");
    expect(out).toContain("Canonical request:\nPOST\n/prod/orders\n");
  });
  it("reports missing fields", async () => {
    expect((await runAwsSigv4Calculator("url: https://x.amazonaws.com/", { mode: "header", unsignedPayload: false, showSteps: false })).error?.message).toBe('Missing "region:" line.');
  });
});
