import { describe, expect, it } from "vitest";
import { buildUtmLinks, normalizeValue } from "./transform";

const o = { spaces: "underscore", lowercase: true, overwrite: true } as const;

describe("normalizeValue", () => {
  it("lower-cases and replaces spaces", () => {
    expect(normalizeValue(" Spring Sale ", o)).toBe("spring_sale");
    expect(normalizeValue("Spring Sale", { ...o, spaces: "hyphen", lowercase: false })).toBe("Spring-Sale");
    expect(normalizeValue("A B", { ...o, spaces: "encode" })).toBe("a b");
  });
});

describe("buildUtmLinks", () => {
  it("appends parameters in canonical order, keeping the hash and existing query", () => {
    const r = buildUtmLinks("https://example.com/pricing?ref=x#plans\nsource: Newsletter\nmedium=email\ncampaign: Spring Sale\ncontent: hero", o);
    expect(r.error).toBeNull();
    expect(r.output).toBe("https://example.com/pricing?ref=x&utm_source=newsletter&utm_medium=email&utm_campaign=spring_sale&utm_content=hero#plans");
  });
  it("handles several URLs, bare hosts and overwrite behaviour", () => {
    const text = "example.com/a\nhttps://example.org/?utm_source=old\nutm_source=new\nutm_medium=m\nutm_campaign=c";
    const r = buildUtmLinks(text, o);
    expect(r.output.split("\n")).toEqual([
      "https://example.com/a?utm_source=new&utm_medium=m&utm_campaign=c",
      "https://example.org/?utm_source=new&utm_medium=m&utm_campaign=c",
    ]);
    expect(buildUtmLinks(text, { ...o, overwrite: false }).output).toContain("example.org/?utm_source=old&utm_medium=m");
  });
  it("reports missing required params, unknown keys and missing URLs", () => {
    expect(buildUtmLinks("https://a.com\nsource=x", o).error?.message).toContain("utm_medium");
    expect(buildUtmLinks("https://a.com\nfoo=bar", o).error?.message).toContain("Unknown parameter");
    expect(buildUtmLinks("source=x", o).error?.message).toContain("URL");
    expect(buildUtmLinks("", o).output).toBe("");
  });
});
