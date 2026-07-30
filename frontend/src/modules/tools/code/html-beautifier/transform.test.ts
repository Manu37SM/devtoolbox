import { describe, expect, it } from "vitest";
import { beautifyHtml } from "./transform";

const base = { mode: "beautify" as const, tabWidth: 2 as const };

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
});
