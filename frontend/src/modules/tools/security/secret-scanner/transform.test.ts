import { describe, expect, it } from "vitest";
import { mask, runSecretScanner, scan } from "./transform";

// Fake tokens are assembled at runtime so this file itself does not look like a leak.
const aws = "AKIA" + "ABCDEFGHIJKLMNOP";
const gh = "ghp_" + "a".repeat(36);
const slack = "xoxb-" + "1234567890-abcdefghij";
const stripe = "sk_live_" + "A".repeat(24);
const jwt = "eyJhbGciOiJIUzI1NiJ9." + "eyJzdWIiOiIxMjM0NTYifQ." + "abcdefghijkl";
const pem = "-----BEGIN " + "RSA PRIVATE KEY-----";

describe("scan", () => {
  it.each([
    ["aws-access-key", `key = ${aws}`],
    ["github-token", `token: ${gh}`],
    ["slack-token", slack],
    ["stripe-live", stripe],
    ["jwt", `Authorization: Bearer ${jwt}`],
    ["private-key", pem],
    ["basic-auth-url", "postgres://admin:hunter22xyz@db.internal:5432/app"],
  ])("detects %s", (id, text) => {
    expect(scan(text, true).map((f) => f.rule.id)).toContain(id);
  });
  it("detects generic assignments but skips placeholders", () => {
    expect(scan('password = "Tr0ub4dor&3xx"', true)).toHaveLength(1);
    expect(scan('password = "changeme"', true)).toHaveLength(0);
    expect(scan('api_key: "${API_KEY}"', true)).toHaveLength(0);
    expect(scan('password = "Tr0ub4dor&3xx"', false)).toHaveLength(0);
  });
  it("ignores placeholder credentials in URLs and reports line numbers", () => {
    expect(scan("https://user:password@example.com/", true)).toHaveLength(0);
    expect(scan(`a\n\nb ${aws}`, true)[0]!.line).toBe(3);
  });
  it("does not flag near-misses", () => {
    expect(scan("AKIA" + "SHORT", true)).toHaveLength(0);
    expect(scan("ghp_tooshort", true)).toHaveLength(0);
  });
});

describe("runSecretScanner", () => {
  it("masks by default and reveals on request", () => {
    const masked = runSecretScanner(aws, { includeGeneric: true, revealValues: false }).output;
    expect(masked).toContain("[HIGH] line 1: AWS access key ID");
    expect(masked).not.toContain(aws);
    expect(runSecretScanner(aws, { includeGeneric: true, revealValues: true }).output).toContain(aws);
  });
  it("sorts by severity and reports clean text", () => {
    const out = runSecretScanner(`password = "Tr0ub4dor&3xx"\n${aws}`, { includeGeneric: true, revealValues: false }).output;
    expect(out.indexOf("[HIGH]")).toBeLessThan(out.indexOf("[LOW]"));
    expect(runSecretScanner("hello", { includeGeneric: true, revealValues: false }).output).toContain("No known secret patterns");
    expect(runSecretScanner("", { includeGeneric: true, revealValues: false }).output).toBe("");
  });
  it("mask() never leaks short values", () => {
    expect(mask("abcd")).toBe("****");
    expect(mask("abcdefghijklmnop")).toMatch(/^abcd…\*+…op \(16 chars\)$/);
  });
});
