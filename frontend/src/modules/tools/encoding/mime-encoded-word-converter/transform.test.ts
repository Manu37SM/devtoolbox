import { describe, expect, it } from "vitest";
import { decodeWords, mimeEncodedWord } from "./transform";

const run = (input: string, o: Parameters<typeof mimeEncodedWord>[1]) => mimeEncodedWord(input, o);

describe("quoted-printable (expected values from Python quopri)", () => {
  it.each([
    ["héllo wörld = ok\n", "h=C3=A9llo w=C3=B6rld =3D ok\n"],
    ["trailing  \nline two\t\n", "trailing =20\nline two=09\n"],
    ["a".repeat(100) + "\n", `${"a".repeat(75)}=\n${"a".repeat(25)}\n`],
    ["é".repeat(60) + "\n", "é"],
  ])("encodes %#", (input, expected) => {
    if (expected === "é") {
      const out = run(input, { mode: "qp-encode" }).output;
      const lines = out.split("\n");
      expect(lines[0]).toBe("=C3=A9".repeat(12) + "=C3=");
      expect(lines[1]!.startsWith("=A9=C3=A9")).toBe(true);
      expect(lines.every((l) => l.length <= 76)).toBe(true);
      expect(run(out, { mode: "qp-decode" }).output).toBe(input);
    } else expect(run(input, { mode: "qp-encode" }).output).toBe(expected);
  });
  it("breaks lines at exactly 76 characters", () => {
    expect(run("a".repeat(76), { mode: "qp-encode" }).output).toBe("a".repeat(76));
    expect(run("a".repeat(77), { mode: "qp-encode" }).output).toBe(`${"a".repeat(75)}=\naa`);
  });
  it("honours CRLF, no wrapping and encode-all", () => {
    expect(run("x=y\nz", { mode: "qp-encode", eol: "crlf" }).output).toBe("x=3Dy\r\nz");
    expect(run("a".repeat(200), { mode: "qp-encode", lineLength: 0 }).output).toHaveLength(200);
    expect(run("a b.c", { mode: "qp-encode", encodeAll: true }).output).toBe("a=20b=2Ec");
  });
  it("decodes soft breaks, lowercase hex, charsets and stray equals", () => {
    expect(run("caf=C3=A9 au la=\nit", { mode: "qp-decode" }).output).toBe("café au lait");
    expect(run("J=f6rg", { mode: "qp-decode", charset: "iso-8859-1" }).output).toBe("Jörg");
    expect(run("100% =ZZ ok", { mode: "qp-decode" }).output).toBe("100% =ZZ ok");
    expect(run("x", { mode: "qp-decode", charset: "nope-9" }).error?.message).toMatch(/Unknown character set/);
  });
});

describe("encoded words (expected values from Python email.header)", () => {
  it("decodes the Python-verified header samples", () => {
    expect(decodeWords("=?UTF-8?Q?caf=C3=A9_au_lait?=")).toBe("café au lait");
    expect(decodeWords("=?utf-8?B?5pel5pys6Kqe?= =?utf-8?B?44OG44K544OI?=")).toBe("日本語テスト");
    expect(decodeWords("=?iso-8859-1?Q?J=F6rg_M=FCller?= <j@x.de>")).toBe("Jörg Müller <j@x.de>");
    expect(decodeWords("Re: =?UTF-8?Q?=E2=82=AC?= 5")).toBe("Re: € 5");
    expect(decodeWords("=?UTF-8*en?Q?hi?=")).toBe("hi");
  });
  it("leaves plain ASCII alone unless forced", () => {
    expect(run("Hello", { mode: "word-encode" }).output).toBe("Hello");
    expect(run("Hello", { mode: "word-encode", forceEncode: true, wordEncoding: "Q" }).output).toBe("=?utf-8?Q?Hello?=");
  });
  it("encodes with Q, B or whichever is shorter, and the result decodes back", () => {
    expect(run("café au lait", { mode: "word-encode", wordEncoding: "Q" }).output).toBe("=?utf-8?Q?caf=C3=A9_au_lait?=");
    expect(run("日本語", { mode: "word-encode", wordEncoding: "B" }).output).toBe("=?utf-8?B?5pel5pys6Kqe?=");
    expect(run("日本語", { mode: "word-encode" }).output).toMatch(/\?B\?/);
    expect(run("café au lait et du pain", { mode: "word-encode" }).output).toMatch(/\?Q\?/);
  });
  it("keeps every encoded word within 75 characters and round-trips long text", () => {
    const text = "Überprüfung der Rechnung für das Geschäftsjahr — bitte dringend prüfen und bestätigen, danke schön".repeat(2);
    for (const wordEncoding of ["Q", "B"] as const) {
      const out = run(text, { mode: "word-encode", wordEncoding, wordSeparator: "fold" }).output;
      for (const w of out.split(/\n/)) expect(w.trim().length).toBeLessThanOrEqual(75);
      expect(decodeWords(out)).toBe(text);
    }
  });
  it("encodes in iso-8859-1 and rejects characters it cannot hold", () => {
    expect(run("Jörg", { mode: "word-encode", charset: "iso-8859-1", wordEncoding: "Q" }).output).toBe("=?iso-8859-1?Q?J=F6rg?=");
    expect(run("日本", { mode: "word-encode", charset: "iso-8859-1" }).error?.message).toMatch(/cannot be represented/);
    expect(run("x", { mode: "word-encode", charset: "shift_jis", forceEncode: true }).error).not.toBeNull();
  });
  it("handles empty input", () => {
    expect(run("", {})).toEqual({ output: "", error: null });
  });
});
