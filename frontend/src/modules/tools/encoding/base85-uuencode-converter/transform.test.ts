import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { base85UuencodeConverter as conv } from "./transform";

const hex = (b: Buffer | number[]) => Buffer.from(b).toString("hex");
const enc = (data: number[], format: "ascii85" | "adobe" | "rfc1924" | "z85" | "uuencode", extra = {}) =>
  conv(hex(data), { action: "encode", inputKind: "hex", format, ...extra });
const dec = (text: string, format: "ascii85" | "adobe" | "rfc1924" | "z85" | "uuencode") => conv(text, { action: "decode", outputKind: "hex", format });

describe("base85 / uuencode", () => {
  it("known vectors", () => {
    expect(conv("Man ", { format: "ascii85" }).output).toBe("9jqo^");
    expect(conv("Hello", { format: "adobe" }).output).toBe("<~87cURDZ~>");
    expect(conv("Hello", { format: "rfc1924" }).output).toBe("NM&qnZv");
    expect(conv("Cat", { format: "uuencode", fileName: "cat.txt" }).output).toBe("begin 644 cat.txt\n#0V%T\n`\nend");
  });
  it("z85 spec example", () => {
    expect(enc([0x86, 0x4f, 0xd2, 0x6f, 0xb5, 0x59, 0xf7, 0x5b], "z85").output).toBe("HelloWorld");
    expect(dec("HelloWorld", "z85").output).toBe("864fd26fb559f75b");
  });
  it("zero groups use z in ascii85 only", () => {
    expect(enc([0, 0, 0, 0, 1], "ascii85").output).toMatch(/^z!/);
    expect(enc([0, 0, 0, 0], "rfc1924").output).toBe("00000");
  });
  it("round-trips every length", () => {
    for (const f of ["ascii85", "adobe", "rfc1924", "uuencode"] as const) {
      for (let n = 0; n < 70; n++) {
        const data = Array.from({ length: n }, (_, i) => (i * 37 + n * 11) & 255);
        const e = enc(data, f, { wrap: 17 });
        expect(e.error).toBeNull();
        expect(dec(e.output, f).output, `${f} ${n}`).toBe(hex(data));
      }
    }
  });
  it("errors", () => {
    expect(dec("abc{def", "ascii85").error).not.toBeNull();
    expect(dec("s8W-!s8W-!", "ascii85").error).toBeNull(); // 0xffffffff ×2 is the maximum, valid
    expect(dec("uuuuu", "ascii85").error).not.toBeNull(); // > 2^32
    expect(conv("abc", { format: "z85" }).error?.message).toMatch(/multiple of 4/);
    expect(conv("zz", { action: "encode", inputKind: "hex", format: "adobe" }).error).not.toBeNull();
  });
  it("utf-8 text survives", () => {
    const e = conv("héllo ✓", { format: "rfc1924" });
    expect(conv(e.output, { action: "decode", format: "rfc1924" }).output).toBe("héllo ✓");
  });
});

// Oracle: Python's base64 / binascii
const py = spawnSync("python3", ["-c", "import base64, binascii"], { encoding: "utf8" }).status === 0;
describe.skipIf(!py)("matches Python", () => {
  const script = `
import sys, json, base64, binascii
cases = json.load(sys.stdin)
out = []
for h in cases:
    d = bytes.fromhex(h)
    uu = b"".join(binascii.b2a_uu(d[i:i+45], backtick=True) for i in range(0, len(d), 45)).decode()
    out.append({"a85": base64.a85encode(d).decode(), "adobe": base64.a85encode(d, adobe=True).decode(), "b85": base64.b85encode(d).decode(), "uu": uu + "\`\\n"})
print(json.dumps(out))`;
  let s = 12345;
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) >> 8) & 255;
  const cases = Array.from({ length: 160 }, (_, i) => Array.from({ length: i < 90 ? i : 90 + (i - 90) * 7 }, (_, j) => (i % 5 === 0 && j % 4 !== 3 ? 0 : rnd())));
  const r = spawnSync("python3", ["-c", script], { input: JSON.stringify(cases.map(hex)), encoding: "utf8" });
  const want = r.status === 0 ? (JSON.parse(r.stdout) as { a85: string; adobe: string; b85: string; uu: string }[]) : [];
  it("ascii85, adobe, base85, uuencode on 160 byte strings", () => {
    expect(want).toHaveLength(160);
    cases.forEach((c, i) => {
      if (!c.length) return; // empty input encodes to nothing here
      const w = want[i]!;
      expect(enc(c, "ascii85").output, `a85 ${i}`).toBe(w.a85);
      expect(enc(c, "adobe").output, `adobe ${i}`).toBe(w.adobe);
      expect(enc(c, "rfc1924").output, `b85 ${i}`).toBe(w.b85);
      if (c.length) {
        const body = enc(c, "uuencode").output.split("\n").slice(1, -1).join("\n") + "\n";
        expect(body, `uu ${i}`).toBe(w.uu);
      }
      expect(dec(w.a85, "ascii85").output).toBe(hex(c));
      expect(dec(w.b85, "rfc1924").output).toBe(hex(c));
    });
  });
});
