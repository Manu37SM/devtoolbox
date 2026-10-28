import { describe, expect, it } from "vitest";
import { runUnicodeNormalizer } from "./transform";

const base = { form: "NFC" as const, stripDiacritics: false, removeInvisible: false, straightenQuotes: false, collapseSpaces: false };
const run = (s: string, o = {}) => runUnicodeNormalizer(s, { ...base, ...o }).output;

describe("runUnicodeNormalizer", () => {
  it("NFC composes and NFD decomposes", () => {
    expect(run("é")).toBe("é");
    expect(run("é", { form: "NFD" })).toBe("é");
  });
  it("NFKC folds compatibility characters", () => {
    expect(run("ﬁ ① Ａ", { form: "NFKC" })).toBe("fi 1 A");
    expect(run("ﬁ", { form: "NFC" })).toBe("ﬁ");
  });
  it("strips combining marks (letters like ł have no decomposition and stay)", () => {
    expect(run("Crème Brûlée, São Paulo, Zażółć", { stripDiacritics: true })).toBe("Creme Brulee, Sao Paulo, Zazołc");
  });
  it("removes invisible characters", () => {
    expect(run("a​b﻿c­d‮e", { removeInvisible: true })).toBe("abcde");
  });
  it("straightens quotes and dashes", () => {
    expect(run("“Hi” ‘x’ – y…", { straightenQuotes: true })).toBe('"Hi" \'x\' - y...');
  });
  it("collapses exotic spaces", () => {
    expect(run("a  b　c   d", { collapseSpaces: true })).toBe("a b c d");
  });
});
