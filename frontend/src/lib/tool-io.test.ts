import { describe, expect, it } from "vitest";
import {
  TOOL_IO,
  bytesToBase64,
  bytesToSpacedHex,
  decodeFileBytes,
  downloadFileName,
  fenceLanguage,
  formatStats,
  looksBinary,
  mimeForFileName,
  sniffExtension,
  textStats,
  toMarkdownCodeBlock,
  utf8Length,
} from "./tool-io";

const enc = (s: string) => new TextEncoder().encode(s);

describe("sniffExtension", () => {
  it("recognises JSON, XML, HTML, SVG, VTT, ICS and PEM", () => {
    expect(sniffExtension('{"a":1}')).toBe("json");
    expect(sniffExtension("[1, 2]\n")).toBe("json");
    expect(sniffExtension("<?xml version=\"1.0\"?><a/>")).toBe("xml");
    expect(sniffExtension("<SpikeArrest name=\"x\"><Rate>1ps</Rate></SpikeArrest>")).toBe("xml");
    expect(sniffExtension("<!DOCTYPE html><html></html>")).toBe("html");
    expect(sniffExtension('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).toBe("svg");
    expect(sniffExtension("WEBVTT\n\n00:00.000 --> 00:01.000\nhi")).toBe("vtt");
    expect(sniffExtension("BEGIN:VCALENDAR\nEND:VCALENDAR")).toBe("ics");
    expect(sniffExtension("-----BEGIN PUBLIC KEY-----\nMFk=\n-----END PUBLIC KEY-----")).toBe("pem");
  });

  it("returns null for ambiguous text, including brace-wrapped non-JSON", () => {
    expect(sniffExtension("")).toBeNull();
    expect(sniffExtension("key: value")).toBeNull();
    expect(sniffExtension("{ not json }")).toBeNull();
    expect(sniffExtension("a < b > c")).toBeNull();
  });
});

describe("downloadFileName", () => {
  it("prefers the configured exact name", () => {
    expect(downloadFileName("dockerfile-generator", "FROM x")).toBe("Dockerfile");
  });
  it("sniffs content before falling back to the configured extension", () => {
    expect(downloadFileName("json-yaml", '{"a":1}')).toBe("json-yaml.json");
    expect(downloadFileName("json-yaml", "a: 1")).toBe("json-yaml.yaml");
  });
  it("defaults to .txt for unknown tools and text", () => {
    expect(downloadFileName("case-converter", "HELLO")).toBe("case-converter.txt");
    expect(downloadFileName(null, "x")).toBe("output.txt");
  });
});

describe("mime and fence language", () => {
  it("maps extensions to MIME types with charset", () => {
    expect(mimeForFileName("a.json")).toBe("application/json;charset=utf-8");
    expect(mimeForFileName("Dockerfile")).toBe("text/plain;charset=utf-8");
  });
  it("maps file names to Markdown fence languages", () => {
    expect(fenceLanguage("compose.yaml")).toBe("yaml");
    expect(fenceLanguage("ci.yml")).toBe("yaml");
    expect(fenceLanguage("Dockerfile")).toBe("dockerfile");
    expect(fenceLanguage(".env")).toBe("dotenv");
    expect(fenceLanguage(".gitignore")).toBe("");
    expect(fenceLanguage("LICENSE")).toBe("");
    expect(fenceLanguage("x.txt")).toBe("");
    expect(fenceLanguage("x.sql")).toBe("sql");
  });
  it("uses a fence longer than any backtick run in the text", () => {
    expect(toMarkdownCodeBlock("a\n", "yaml")).toBe("```yaml\na\n```");
    expect(toMarkdownCodeBlock("use ```js here", "md")).toBe("````md\nuse ```js here\n````");
  });
});

describe("file decoding", () => {
  it("loads UTF-8 text and strips a BOM", () => {
    const r = decodeFileBytes("a.json", new Uint8Array([0xef, 0xbb, 0xbf, ...enc('{"₹":1}')]));
    expect(r).toEqual({ ok: true, text: '{"₹":1}', note: "Loaded a.json (12 B)" });
  });

  it("treats NUL bytes and invalid UTF-8 as binary", () => {
    expect(looksBinary(new Uint8Array([0x30, 0x82, 0x00, 0x05]))).toBe(true);
    expect(looksBinary(new Uint8Array([0xff, 0xfe, 0x41]))).toBe(true);
    expect(looksBinary(enc("plain text\twith tabs\r\n"))).toBe(false);
    expect(looksBinary(enc("\u001b[31mred\u001b[0m"))).toBe(false);
  });

  it("does not misjudge text when the 8 KB sample cuts a multi-byte character", () => {
    const text = "a".repeat(8191) + "₹".repeat(10);
    expect(looksBinary(enc(text))).toBe(false);
  });

  it("refuses binary for text tools and converts it for hex/base64 tools", () => {
    const der = new Uint8Array([0x30, 0x03, 0x02, 0x01, 0x00]);
    expect(decodeFileBytes("k.der", der)).toEqual({ ok: false, error: "k.der looks like a binary file; this tool expects text." });
    expect(decodeFileBytes("k.der", der, "auto-hex")).toEqual({ ok: true, text: "30 03 02 01 00", note: "Loaded k.der (5 B) as hex" });
    expect(decodeFileBytes("k.der", der, "auto-base64")).toMatchObject({ ok: true, text: "MAMCAQA=" });
  });

  it("wraps binary DER as a PEM certificate at 64 columns", () => {
    const r = decodeFileBytes("c.der", new Uint8Array(60).map((_, i) => i), "auto-pem");
    const lines = r.ok ? r.text.split("\n") : [];
    expect(lines[0]).toBe("-----BEGIN CERTIFICATE-----");
    expect(lines[1]).toHaveLength(64);
    expect(lines.at(-1)).toBe("-----END CERTIFICATE-----");
    expect(atob(lines.slice(1, -1).join(""))).toHaveLength(60);
  });

  it("wraps hex at 32 bytes per line and base64-encodes large inputs in chunks", () => {
    expect(bytesToSpacedHex(new Uint8Array(33)).split("\n")).toHaveLength(2);
    const big = new Uint8Array(100_000).map((_, i) => i % 256);
    expect(atob(bytesToBase64(big)).length).toBe(100_000);
  });

  it("rejects files over the size limit before decoding", () => {
    const r = decodeFileBytes("huge.log", new Uint8Array(20 * 1024 * 1024 + 1));
    expect(r.ok).toBe(false);
  });
});

describe("text statistics", () => {
  it("counts code points, lines, words and UTF-8 bytes", () => {
    expect(textStats("")).toEqual({ chars: 0, lines: 0, words: 0, bytes: 0 });
    expect(textStats("héllo 👋\nworld")).toEqual({ chars: 13, lines: 2, words: 3, bytes: 17 });
    expect(utf8Length("₹")).toBe(3);
    expect(utf8Length("\ud800")).toBe(3);
  });
  it("formats with singulars and an optional selection", () => {
    expect(formatStats(textStats("a"))).toBe("1 char · 1 line · 1 word · 1 B");
    expect(formatStats({ chars: 2048, lines: 3, words: 0, bytes: 2048 }, 5)).toBe("2,048 chars · 3 lines · 2.0 KB · 5 selected");
  });
});

describe("TOOL_IO config", () => {
  it("only uses known read modes and well-formed download names", () => {
    for (const [slug, c] of Object.entries(TOOL_IO)) {
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      if (c.fileRead) expect(["text", "auto-hex", "auto-base64", "auto-pem"]).toContain(c.fileRead);
      if (c.downloadName) expect(c.downloadName).not.toMatch(/[\\/]/);
      if (c.ext) expect(c.ext).toMatch(/^[a-z0-9]+$/);
    }
  });
});
