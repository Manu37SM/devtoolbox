import { describe, expect, it } from "vitest";
import { lookupMime, searchMime } from "./transform";
import { MIME_TYPES } from "./data";

describe("data", () => {
  it("has no duplicate extensions and well-formed MIME types", () => {
    const exts = MIME_TYPES.map(([e]) => e);
    expect(new Set(exts).size).toBe(exts.length);
    for (const [, m] of MIME_TYPES) expect(m).toMatch(/^[a-z]+\/[a-z0-9.+-]+$/);
  });
});

describe("searchMime", () => {
  it("finds by extension in several spellings", () => {
    for (const q of ["json", ".json", "*.json", "data.JSON"]) expect(searchMime(q)).toEqual([["json", "application/json"]]);
    expect(searchMime("archive.tar.gz")).toEqual([["gz", "application/gzip"]]);
  });
  it("finds by MIME substring", () => {
    expect(searchMime("image/").every(([, m]) => m.startsWith("image/"))).toBe(true);
    expect(searchMime("spreadsheet").map(([e]) => e)).toEqual(["xlsx"]);
    expect(searchMime("application/json").map(([e]) => e)).toEqual(expect.arrayContaining(["json", "map"]));
  });
  it("returns everything for an empty query and nothing for gibberish", () => {
    expect(searchMime("")).toHaveLength(MIME_TYPES.length);
    expect(searchMime("zzzzz")).toEqual([]);
  });
});

describe("lookupMime", () => {
  it("formats in either column order", () => {
    expect(lookupMime("png", { format: "ext-first" }).output).toMatch(/^\.png\s+image\/png$/);
    expect(lookupMime("png", { format: "mime-first" }).output).toMatch(/^image\/png\s+\.png$/);
  });
  it("reports no matches", () => {
    expect(lookupMime("zzzzz", { format: "ext-first" }).output).toBe('Nothing matches "zzzzz".');
  });
});
