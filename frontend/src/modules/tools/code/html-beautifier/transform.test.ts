import { describe, expect, it } from "vitest";
import { beautifyHtml } from "./transform";

const base = { mode: "beautify" as const, tabWidth: 2 as const, useTabs: false, printWidth: 80 as const, whitespace: "css" as const, singleAttributePerLine: false, bracketSameLine: false, keepComments: false };

describe("beautifyHtml — beautify mode", () => {
  it("formats a nested HTML document", async () => {
    const result = await beautifyHtml("<div><p>Hello</p><ul><li>a</li><li>b</li></ul></div>", base);
    expect(result.error).toBeNull();
    expect(result.output).toContain("<div>");
    expect(result.output).toContain("<li>a</li>");
  });

  it("supports a 4-space tab width", async () => {
    const result = await beautifyHtml("<div>\n<p>hi</p>\n</div>", { ...base, tabWidth: 4 });
    expect(result.error).toBeNull();
  });

  it("returns empty output for empty input", async () => {
    expect(await beautifyHtml("", base)).toEqual({ output: "", error: null });
  });

  it("formats embedded style blocks", async () => {
    const result = await beautifyHtml("<style>a{color:red}</style>", base);
    expect(result.error).toBeNull();
    expect(result.output).toContain("color: red");
  });
});

describe("beautifyHtml — minify mode", () => {
  it("collapses whitespace and removes comments", async () => {
    const result = await beautifyHtml("<div>\n  <p>Hello   world</p>\n  <!-- comment -->\n</div>", {
      ...base,
      mode: "minify",
    });
    expect(result.error).toBeNull();
    expect(result.output).toBe("<div><p>Hello world</p></div>");
  });

  it("minifies embedded style blocks", async () => {
    const result = await beautifyHtml("<style>\n  a {\n    color: red;\n  }\n</style>", {
      ...base,
      mode: "minify",
    });
    expect(result.output).toBe("<style>a{color:red}</style>");
  });

  it("returns empty output for empty input", async () => {
    expect(await beautifyHtml("", { ...base, mode: "minify" })).toEqual({ output: "", error: null });
  });

  it("puts each attribute on its own line, indents with tabs and keeps comments when minifying", async () => {
    const src = '<a href="/x" class="btn btn-primary" data-track="cta" target="_blank" rel="noopener">Go</a>';
    expect((await beautifyHtml(src, { ...base, singleAttributePerLine: true, printWidth: 80 })).output).toBe(
      '<a\n  href="/x"\n  class="btn btn-primary"\n  data-track="cta"\n  target="_blank"\n  rel="noopener"\n  >Go</a\n>\n',
    );
    expect((await beautifyHtml("<div><p>x</p></div>", { ...base, useTabs: true })).output).toBe("<div><p>x</p></div>\n");
    expect((await beautifyHtml("<!-- keep --><p>x</p>", { ...base, mode: "minify", keepComments: true })).output).toBe("<!-- keep --><p>x</p>");
    expect((await beautifyHtml("<!-- drop --><p>x</p>", { ...base, mode: "minify" })).output).toBe("<p>x</p>");
  });
});
