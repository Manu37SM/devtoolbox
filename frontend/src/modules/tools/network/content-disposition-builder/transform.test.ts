import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { asciiFallback, buildHeader, contentDispositionBuilder as fn, encodeExtValue, parseHeader } from "./transform";
import { contentDispositionBuilderOptionsSchema } from "./schema";

const O = contentDispositionBuilderOptionsSchema.parse({});
const build = (n: string, o: Partial<typeof O> = {}) => buildHeader(n, { ...O, ...o });

describe("encoding", () => {
  it("RFC 8187 examples", () => {
    expect(encodeExtValue("£ rates")).toBe("%C2%A3%20rates");
    expect(encodeExtValue("€ rates")).toBe("%E2%82%AC%20rates");
    expect(encodeExtValue("a'b*c(d)")).toBe("a%27b%2Ac%28d%29");
  });
  it("quotes backslash and double quote", () => {
    expect(build('a"b\\c.txt', { stripPath: false }).header).toBe('attachment; filename="a\\"b\\\\c.txt"');
  });
  it("ASCII names stay a single parameter", () => {
    expect(build("report 2024.pdf").header).toBe('attachment; filename="report 2024.pdf"');
  });
  it("non-ASCII adds filename* with a transliterated fallback", () => {
    expect(build("résumé – 日本.pdf").header).toBe(`attachment; filename="resume _ __.pdf"; filename*=UTF-8''r%C3%A9sum%C3%A9%20%E2%80%93%20%E6%97%A5%E6%9C%AC.pdf`);
  });
  it("fallback modes and % handling", () => {
    expect(asciiFallback("Ünï 100%.txt", "transliterate")).toBe("Uni 100_.txt");
    expect(asciiFallback("Ünï.txt", "underscore")).toBe("_n_.txt");
  });
  it("styles", () => {
    expect(build("é.txt", { style: "ascii" }).header).toBe('attachment; filename="e.txt"');
    expect(build("é.txt", { style: "extended" }).header).toBe("attachment; filename*=UTF-8''%C3%A9.txt");
    expect(build("a.txt", { alwaysExtended: true }).header).toBe(`attachment; filename="a.txt"; filename*=UTF-8''a.txt`);
  });
  it("form-data includes the field name", () => {
    expect(build("a.txt", { disposition: "form-data", fieldName: 'up"load' }).header).toBe('form-data; name="up\\"load"; filename="a.txt"');
  });
});

describe("safety", () => {
  it("strips CR/LF so the value cannot split the response", () => {
    const b = build("a.txt\r\nSet-Cookie: x=1");
    expect(b.header).not.toMatch(/[\r\n]/);
    expect(b.warnings.join()).toMatch(/response-splitting/);
  });
  it("removes paths and flags device names", () => {
    expect(build("../../etc/passwd").name).toBe("passwd");
    expect(build("C:\\temp\\CON.txt").warnings.join()).toMatch(/reserved device/);
  });
  it("windows-safe replaces forbidden characters", () => {
    expect(build('a:b?c*.txt', { windowsSafe: true }).name).toBe("a_b_c_.txt");
  });
  it("long names are flagged", () => {
    expect(build("a".repeat(300)).warnings.join()).toMatch(/255-byte/);
  });
});

describe("parse", () => {
  it("prefers filename* and decodes UTF-8 and latin1", () => {
    const p = parseHeader(`attachment; filename="EURO rates.txt"; filename*=utf-8''%e2%82%ac%20rates.txt`);
    expect(p.filename).toBe("€ rates.txt");
    expect(p.source).toBe("filename*");
    expect(parseHeader("attachment; filename*=iso-8859-1'en'%A3%20rates").filename).toBe("£ rates");
  });
  it("semicolons inside quotes do not split", () => {
    expect(parseHeader('attachment; filename="a;b.txt"').filename).toBe("a;b.txt");
  });
  it("warns about unquoted and percent filenames", () => {
    expect(parseHeader("attachment; filename=a b.txt").warnings.join()).toMatch(/quoted/);
    expect(parseHeader('attachment; filename="a%20b.txt"').warnings.join()).toMatch(/%XX/);
  });
  it("wrapper output for parse and snippets", () => {
    expect(fn('inline; filename="x.png"', { mode: "parse" }).output).toContain('Effective filename: "x.png"');
    const s = fn("é.pdf", { snippet: "spring" }).output;
    expect(s).toContain('.filename("é.pdf", StandardCharsets.UTF_8)');
    expect(fn("a.txt", { snippet: "flask" }).output).toContain("as_attachment=True");
    expect(fn("a.txt", { headerName: true }).output).toBe('Content-Disposition: attachment; filename="a.txt"');
  });
});

const probe = spawnSync("python3", ["-c", "import werkzeug.http"], { encoding: "utf8" });
describe.skipIf(probe.status !== 0)("werkzeug round trip", () => {
  it("parses every header we build back to the original name", () => {
    const names = ["plain.txt", "with space.txt", 'quo"te.txt', "back\\slash.txt", "semi;colon.txt", "100%.txt", "résumé.pdf", "日本語.txt", "emoji 😀.png", "a,b'c.txt", "tab\tname.txt".replace("\t", "_")];
    const headers = names.map((n) => build(n, { stripPath: false }).header);
    const script = `import json,sys\nfrom werkzeug.http import parse_options_header\nout=[parse_options_header(h)[1].get('filename') for h in json.load(sys.stdin)]\nprint(json.dumps(out,ensure_ascii=False))`;
    const r = spawnSync("python3", ["-c", script], { input: JSON.stringify(headers), encoding: "utf8" });
    const got = JSON.parse(r.stdout) as string[];
    names.forEach((n, i) => {
      // werkzeug applies filename*; ASCII names come from filename=
      expect(got[i], headers[i]).toBe(n);
      expect(parseHeader(headers[i]!).filename).toBe(n);
    });
  });
});
