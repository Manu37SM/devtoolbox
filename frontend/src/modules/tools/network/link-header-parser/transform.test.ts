import { describe, expect, it } from "vitest";
import { parseLinkHeader, runLinkHeader } from "./transform";

const gh = '<https://api.github.com/repos?page=2>; rel="next", <https://api.github.com/repos?page=34>; rel="last"';
const o = { format: "table" as const };

describe("parseLinkHeader", () => {
  it("parses pagination headers", () => {
    expect(parseLinkHeader(gh)).toEqual([
      { url: "https://api.github.com/repos?page=2", params: { rel: "next" } },
      { url: "https://api.github.com/repos?page=34", params: { rel: "last" } },
    ]);
  });
  it("accepts the Link: prefix, bare tokens and commas inside quotes/URIs", () => {
    const r = parseLinkHeader('Link: </a,b>; rel=preload; as=style; title="x, y"; crossorigin');
    expect(r).toEqual([{ url: "/a,b", params: { rel: "preload", as: "style", title: "x, y", crossorigin: "" } }]);
  });
  it("handles escaped quotes and keeps the first duplicate param", () => {
    expect(parseLinkHeader('<u>; title="a \\"q\\""; rel=a; rel=b')[0]!.params).toEqual({ title: 'a "q"', rel: "a" });
  });
  it("handles multi-line header values", () => {
    expect(parseLinkHeader("<a>; rel=next\n<b>; rel=prev")).toHaveLength(2);
  });
  it("throws on malformed input", () => {
    expect(() => parseLinkHeader("rel=next")).toThrow(/Expected "<"/);
    expect(() => parseLinkHeader("<abc")).toThrow(/Unterminated/);
    expect(() => parseLinkHeader('<a>; rel="x')).toThrow(/quoted/);
    expect(() => parseLinkHeader("   ")).toThrow(/No link-value/);
  });
});

describe("runLinkHeader", () => {
  it("renders a table with hints", () => {
    const r = runLinkHeader("</app.css>; rel=preload", o);
    expect(r.output).toContain("1. /app.css");
    expect(r.output).toContain('as="..."');
    expect(runLinkHeader("<x>", o).output).toContain("missing rel");
  });
  it("renders JSON and surfaces errors", () => {
    expect(JSON.parse(runLinkHeader(gh, { ...o, format: "json" }).output)[0]).toEqual({ url: "https://api.github.com/repos?page=2", rel: "next" });
    expect(runLinkHeader("junk", o).error).not.toBeNull();
    expect(runLinkHeader("", o)).toEqual({ output: "", error: null });
  });
});
