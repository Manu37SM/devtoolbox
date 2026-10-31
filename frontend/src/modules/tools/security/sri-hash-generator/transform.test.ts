import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { digestB64, parseIntegrity, readBytes, sriHashGenerator as fn } from "./transform";

const enc = (s: string) => new TextEncoder().encode(s);

describe("digests", () => {
  it("known vectors", () => {
    expect(digestB64(enc(""), "sha256")).toBe("47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=");
    expect(digestB64(enc("abc"), "sha384")).toBe("ywB1P0WjXou1oD1pmsZQBycsMqsO3tFjGotgWkP/W+2AhgcroefMI1i67KE0yCWn");
    expect(digestB64(enc("abc"), "sha512")).toBe("3a81oZNherrMQXNJriBBMRLm+k6JqX6iCp7u5ktV05ohkpkqJ0/BqDa6PCOj/uu9RU1EI2Q86A4qmslPpUyknw==");
  });
});

describe("output formats", () => {
  it("integrity value for several algorithms, ordered weakest to strongest", () => {
    const r = fn("abc", { algorithms: ["sha512", "sha256"] });
    expect(r.output.split(" ").map((t) => t.split("-")[0])).toEqual(["sha256", "sha512"]);
  });
  it("script and link tags honour crossorigin", () => {
    expect(fn("x", { format: "script", url: "https://a/b.js" }).output).toMatch(/^<script src="https:\/\/a\/b\.js" integrity="sha384-[^"]+" crossorigin="anonymous"><\/script>$/);
    expect(fn("x", { format: "link", url: "https://a/b.css", crossorigin: "none" }).output).toMatch(/^<link rel="stylesheet" href="https:\/\/a\/b\.css" integrity="sha384-[^"]+">$/);
  });
  it("CSP sources are single quoted", () => {
    expect(fn("x", { format: "csp", algorithms: ["sha256", "sha384"] }).output).toMatch(/^'sha256-[^']+' 'sha384-[^']+'$/);
  });
  it("json output has byte count and per-alg hashes", () => {
    const j = JSON.parse(fn("abc", { format: "json", algorithms: ["sha256"] }).output) as { bytes: number; hashes: { sha256: string } };
    expect(j.bytes).toBe(3);
    expect(j.hashes.sha256).toBe(digestB64(enc("abc"), "sha256"));
  });
});

describe("input handling", () => {
  it("line endings change the digest", () => {
    const lf = fn("a\nb\n", { lineEndings: "keep" }).output;
    const crlf = fn("a\nb\n", { lineEndings: "crlf" }).output;
    expect(lf).not.toBe(crlf);
    expect(fn("a\r\nb\r\n", { lineEndings: "lf" }).output).toBe(lf);
  });
  it("hex and base64 inputs", () => {
    expect(fn("616263", { inputKind: "hex" }).output).toBe(fn("abc").output);
    expect(fn("YWJj", { inputKind: "base64" }).output).toBe(fn("abc").output);
    expect(fn("0x61 0x62 0x63", { inputKind: "hex" }).output).toBe(fn("abc").output);
    expect(fn("zz", { inputKind: "hex" }).error).not.toBeNull();
    expect(readBytes("YWJj", "base64", "keep")).toEqual(enc("abc"));
  });
  it("multibyte text hashes UTF-8 bytes", () => {
    const want = digestB64(Uint8Array.from([0xe2, 0x82, 0xac]), "sha256");
    expect(fn("€", { algorithms: ["sha256"] }).output).toBe("sha256-" + want);
  });
});

describe("verify", () => {
  const good = fn("abc", { algorithms: ["sha384"] }).output;
  it("accepts a matching hash", () => {
    const r = fn("abc", { action: "verify", expected: good });
    expect(r.output).toContain("MATCH    sha384");
    expect(r.output).toContain("ACCEPT");
  });
  it("blocks a mismatch and shows both digests", () => {
    const r = fn("abd", { action: "verify", expected: good });
    expect(r.output).toContain("MISMATCH");
    expect(r.output).toContain("BLOCK");
  });
  it("only the strongest algorithm decides", () => {
    const weak = fn("abc", { algorithms: ["sha256"] }).output;
    const bad = "sha512-" + "A".repeat(86) + "==";
    const r = fn("abc", { action: "verify", expected: `${weak} ${bad}` });
    expect(r.output).toContain("BLOCK");
    expect(r.output).toContain("ignored by browsers");
  });
  it("tolerates options after ? and skips unknown tokens", () => {
    const p = parseIntegrity(`${good}?ct=text/javascript md5-xyz`);
    expect(p.valid).toHaveLength(1);
    expect(p.invalid).toEqual(["md5-xyz"]);
  });
  it("requires an expected value", () => {
    expect(fn("abc", { action: "verify", expected: "" }).error).not.toBeNull();
  });
});

const probe = spawnSync("openssl", ["version"], { encoding: "utf8" });
describe.skipIf(probe.status !== 0)("matches openssl", () => {
  it("sha256/384/512 base64 of random payloads", () => {
    for (const payload of ["", "hello\n", "console.log('€ 日本');\r\n", "x".repeat(10000)]) {
      for (const a of ["sha256", "sha384", "sha512"] as const) {
        const r = spawnSync("openssl", ["dgst", `-${a}`, "-binary"], { input: Buffer.from(payload, "utf8") });
        expect(digestB64(enc(payload), a), `${a} ${payload.slice(0, 10)}`).toBe(r.stdout.toString("base64"));
      }
    }
  });
});
