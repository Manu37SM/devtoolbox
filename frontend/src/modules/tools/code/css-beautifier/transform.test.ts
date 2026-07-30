import { describe, expect, it } from "vitest";
import { beautifyCss } from "./transform";

const base = { mode: "beautify" as const, tabWidth: 2 as const };

describe("beautifyCss — beautify mode", () => {
  it("formats minified CSS", async () => {
    const result = await beautifyCss("a{color:red;background:blue}", base);
    expect(result.error).toBeNull();
    expect(result.output).toBe("a {\n  color: red;\n  background: blue;\n}\n");
  });

  it("supports a 4-space tab width", async () => {
    const result = await beautifyCss("a{color:red}", { ...base, tabWidth: 4 });
    expect(result.output).toBe("a {\n    color: red;\n}\n");
  });

  it("formats nested media queries", async () => {
    const result = await beautifyCss("@media(min-width:100px){a{color:red}}", base);
    expect(result.error).toBeNull();
    expect(result.output).toContain("@media");
  });

  it("returns empty output for empty input", async () => {
    expect(await beautifyCss("", base)).toEqual({ output: "", error: null });
  });

  it("returns a structured error for malformed CSS", async () => {
    const result = await beautifyCss("a{color:", base);
    expect(result.error).not.toBeNull();
  });
});

describe("beautifyCss — minify mode", () => {
  it("minifies formatted CSS, stripping whitespace and shortening colors", async () => {
    const result = await beautifyCss("a {\n  color: red;\n  background: blue;\n}\n", { ...base, mode: "minify" });
    expect(result.error).toBeNull();
    expect(result.output).toBe("a{color:red;background:#00f}");
  });

  it("returns empty output for empty input", async () => {
    expect(await beautifyCss("", { ...base, mode: "minify" })).toEqual({ output: "", error: null });
  });

  it("minifies multiple rules and nested media queries", async () => {
    const result = await beautifyCss(
      "@media (min-width: 100px) {\n  a {\n    color: red;\n  }\n}\n",
      { ...base, mode: "minify" },
    );
    expect(result.error).toBeNull();
    expect(result.output).toBe("@media (min-width:100px){a{color:red}}");
  });
});
