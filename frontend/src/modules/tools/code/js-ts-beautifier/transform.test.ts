import { describe, expect, it } from "vitest";
import { beautifyJsTs } from "./transform";

const base = {
  mode: "beautify" as const,
  language: "javascript" as const,
  semi: true,
  singleQuote: false,
  tabWidth: 2 as const,
};

describe("beautifyJsTs — beautify mode", () => {
  it("formats minified JavaScript", async () => {
    const result = await beautifyJsTs("const x={a:1,b:2}", base);
    expect(result.error).toBeNull();
    expect(result.output).toBe("const x = { a: 1, b: 2 };\n");
  });

  it("formats TypeScript with type annotations", async () => {
    const result = await beautifyJsTs("function f(x:number):number{return x+1}", {
      ...base,
      language: "typescript",
    });
    expect(result.error).toBeNull();
    expect(result.output).toContain("function f(x: number): number");
  });

  it("respects singleQuote option", async () => {
    const result = await beautifyJsTs('const s = "hello";', { ...base, singleQuote: true });
    expect(result.output).toBe("const s = 'hello';\n");
  });

  it("respects semi: false", async () => {
    const result = await beautifyJsTs("const x = 1", { ...base, semi: false });
    expect(result.output).toBe("const x = 1\n");
  });

  it("returns empty output for empty input", async () => {
    expect(await beautifyJsTs("", base)).toEqual({ output: "", error: null });
  });

  it("returns a structured error for unparsable input", async () => {
    const result = await beautifyJsTs("const x = {{{", base);
    expect(result.output).toBe("");
    expect(result.error).not.toBeNull();
  });
});

describe("beautifyJsTs — minify mode", () => {
  it("minifies JavaScript, shortening variable names and stripping whitespace", async () => {
    const result = await beautifyJsTs(
      "function add(firstNumber, secondNumber) {\n  return firstNumber + secondNumber;\n}\n",
      { ...base, mode: "minify" },
    );
    expect(result.error).toBeNull();
    expect(result.output.length).toBeLessThan(60);
    expect(result.output).not.toContain("firstNumber");
  });

  it("preserves program behavior after minifying", async () => {
    const result = await beautifyJsTs("function double(n) { return n * 2; }\nglobalThis.__r = double(21);", {
      ...base,
      mode: "minify",
    });
    expect(result.error).toBeNull();

    const globalThisLike: { __r?: number } = {};
    new Function("globalThis", result.output)(globalThisLike);
    expect(globalThisLike.__r).toBe(42);
  });

  it("returns a clear error for TypeScript input (unsupported)", async () => {
    const result = await beautifyJsTs("function f(x: number): number { return x; }", {
      ...base,
      mode: "minify",
      language: "typescript",
    });
    expect(result.output).toBe("");
    expect(result.error?.message).toContain("TypeScript");
  });

  it("returns empty output for empty input", async () => {
    expect(await beautifyJsTs("", { ...base, mode: "minify" })).toEqual({ output: "", error: null });
  });

  it("returns a structured error for unparsable input", async () => {
    const result = await beautifyJsTs("const x = {{{", { ...base, mode: "minify" });
    expect(result.output).toBe("");
    expect(result.error).not.toBeNull();
  });
});
