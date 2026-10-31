import { execFileSync, spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { analyse, lineEndingConverter } from "./transform";

const run = (input: string, o: Parameters<typeof lineEndingConverter>[1] = {}) => lineEndingConverter(input, o).output;
const has = (cmd: string) => spawnSync(cmd, ["--version"], { encoding: "utf8" }).status === 0;

describe("line endings", () => {
  it("CRLF/CR/mixed → LF", () => {
    expect(run("a\r\nb\rc\nd")).toBe("a\nb\nc\nd\n");
  });
  it("LF → CRLF and CR", () => {
    expect(run("a\nb\n", { eol: "crlf" })).toBe("a\r\nb\r\n");
    expect(run("a\nb\n", { eol: "cr" })).toBe("a\rb\r");
  });
  it("keep leaves each ending alone", () => {
    expect(run("a\r\nb\nc", { eol: "keep", finalNewline: "keep" })).toBe("a\r\nb\nc");
  });
  it("keep + final newline adds the dominant ending", () => {
    expect(run("a\r\nb", { eol: "keep" })).toBe("a\r\nb\r\n");
  });
  it("BOM handling", () => {
    expect(run("﻿a\n", { bom: "remove" })).toBe("a\n");
    expect(run("a\n", { bom: "add" })).toBe("﻿a\n");
    expect(run("﻿a\n", { bom: "keep" })).toBe("﻿a\n");
  });
  it("trims trailing whitespace only when asked", () => {
    expect(run("a  \nb\t\n")).toBe("a\nb\n");
    expect(run("a  \n", { trimTrailing: false })).toBe("a  \n");
  });
  it("final newline policies", () => {
    expect(run("a\n\n\n", { finalNewline: "single" })).toBe("a\n");
    expect(run("a\n\n", { finalNewline: "remove" })).toBe("a");
    expect(run("a", { finalNewline: "keep" })).toBe("a");
  });
  it("collapses blank-line runs", () => {
    expect(run("a\n\n\n\n\nb\n", { maxBlankLines: 1 })).toBe("a\n\nb\n");
    expect(run("a\n\n\n\nb\n", { maxBlankLines: 2 })).toBe("a\n\n\nb\n");
  });
  it("strips invisible, control and exotic spaces", () => {
    expect(run("a​b­c", { removeInvisible: true })).toBe("abc\n");
    expect(run("a\u0007b", { removeControl: true })).toBe("ab\n");
    expect(run("a b　c", { normalizeSpaces: true })).toBe("a b c\n");
  });
  it("report mode counts what it sees", () => {
    const r = run("a \r\nb\n﻿", { output: "report" });
    expect(r).toContain("LF + CRLF");
    expect(analyse("a\r\nb\rc\n")).toMatchObject({ crlf: 1, cr: 1, lf: 1 });
  });
  it("empty input", () => {
    expect(run("")).toBe("");
  });
});

// Oracle: GNU expand / unexpand
const gnu = process.platform !== "win32" && has("expand");
const oracle = (cmd: string, args: string[], input: string) => execFileSync(cmd, args, { input, encoding: "utf8" });
const samples = ["a\tb\n\tx  \n    y\n", "\t\tdeep\n  \tmix\nab\tcd\tef\n", "x\ty\n        eight\n      six\n  two\n\tq\n"];

describe.skipIf(!gnu)("matches GNU expand/unexpand", () => {
  for (const w of [2, 4, 8]) {
    for (const s of samples) {
      it(`expand -t ${w}`, () => {
        expect(run(s, { tabsToSpaces: "all", tabWidth: w, trimTrailing: false })).toBe(oracle("expand", ["-t", String(w)], s));
      });
      it(`expand -i -t ${w}`, () => {
        expect(run(s, { tabsToSpaces: "leading", tabWidth: w, trimTrailing: false })).toBe(oracle("expand", ["-i", "-t", String(w)], s));
      });
      it(`unexpand --first-only -t ${w}`, () => {
        expect(run(s, { spacesToTabs: true, tabWidth: w, trimTrailing: false })).toBe(oracle("unexpand", ["--first-only", "-t", String(w)], s));
      });
    }
  }
});
