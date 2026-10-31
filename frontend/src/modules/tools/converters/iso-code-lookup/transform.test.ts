import { describe, expect, it } from "vitest";
import { COUNTRIES, CURRENCIES, LANGUAGES } from "./data";
import { isoCodeLookup } from "./transform";

// Counts and spot values come from pycountry 26.2.16.
const run = (i: string, o: Parameters<typeof isoCodeLookup>[1] = {}) => isoCodeLookup(i, o);
const json = (i: string, o: Parameters<typeof isoCodeLookup>[1] = {}) => JSON.parse(run(i, { ...o, output: "json" }).output) as { type: string; alpha2?: string; alpha3: string; numeric?: string; name: string }[];

describe("data", () => {
  it("has the full lists", () => {
    expect(COUNTRIES).toHaveLength(249);
    expect(CURRENCIES).toHaveLength(178);
    expect(LANGUAGES).toHaveLength(184);
  });
  it("has unique codes", () => {
    expect(new Set(COUNTRIES.map((c) => c[0])).size).toBe(249);
    expect(new Set(CURRENCIES.map((c) => c[0])).size).toBe(178);
    expect(new Set(LANGUAGES.map((c) => c[0])).size).toBe(184);
  });
});

describe("isoCodeLookup", () => {
  it("finds a country by alpha-2, alpha-3, numeric and name", () => {
    for (const q of ["IN", "ind", "356", "India"]) {
      const r = json(q, { type: "country", match: "exact" });
      expect(r[0]).toMatchObject({ alpha2: "IN", alpha3: "IND", numeric: "356", name: "India" });
    }
  });
  it("keeps leading zeros in numeric codes and accepts them unpadded", () => {
    expect(json("4", { type: "country" })[0]).toMatchObject({ alpha2: "AF", numeric: "004" });
  });
  it("finds currencies and languages", () => {
    expect(json("EUR", { type: "currency" })[0]).toMatchObject({ alpha3: "EUR", numeric: "978", name: "Euro" });
    expect(json("hi", { type: "language", match: "exact" })[0]).toMatchObject({ alpha2: "hi", alpha3: "hin", name: "Hindi" });
    expect(json("392", { type: "currency" })[0]).toMatchObject({ alpha3: "JPY" });
  });
  it("searches across all types and ignores accents", () => {
    expect(json("cote d'ivoire", { type: "country" })[0]!.alpha2).toBe("CI");
    expect(json("Curaçao", { type: "country" })[0]).toMatchObject({ alpha2: "CW", numeric: "531" });
    expect(json("EUR").map((r) => r.type)).toContain("currency");
  });
  it("contains-search matches pycountry's set for 'united' in short or official names", () => {
    const codes = json("united", { type: "country", match: "contains" }).map((r) => r.alpha2).sort();
    expect(codes).toEqual(["AE", "GB", "MX", "TZ", "UM", "US", "VI"]);
  });
  it("handles several queries and reports the missing ones", () => {
    const out = run("US, zzzz, FR", { type: "country", match: "exact" }).output;
    expect(out).toContain("United States");
    expect(out).toContain("France");
    expect(out).toContain("No match: zzzz");
  });
  it("lists every entry of a type when empty", () => {
    expect(run("", { type: "currency", output: "csv" }).output.split("\n")).toHaveLength(179);
    expect(run("", { type: "all" }).output).toBe("");
  });
  it("outputs plain codes in the requested form", () => {
    expect(run("Germany, Japan", { type: "country", output: "codes", codeForm: "alpha3" }).output).toBe("DEU\nJPN");
    expect(run("Germany", { type: "country", output: "codes", codeForm: "numeric" }).output).toBe("276");
  });
  it("includes the official name on request", () => {
    expect(run("CI", { type: "country", match: "exact", includeOfficialName: true, output: "csv" }).output).toContain("Republic of Côte d'Ivoire");
  });
  it("respects the limit and match modes", () => {
    expect(json("a", { type: "country", match: "starts", limit: 3 })).toHaveLength(3);
    expect(run("zzzz").error?.message).toMatch(/Nothing found/);
  });
});
