import { describe, expect, it } from "vitest";
import { convertCase } from "./transform";

describe("convertCase", () => {
  it("converts to camelCase from snake_case", () => {
    expect(convertCase("hello_world_example", { target: "camel" })).toBe("helloWorldExample");
  });

  it("converts to PascalCase from kebab-case", () => {
    expect(convertCase("hello-world-example", { target: "pascal" })).toBe("HelloWorldExample");
  });

  it("converts to snake_case from camelCase", () => {
    expect(convertCase("helloWorldExample", { target: "snake" })).toBe("hello_world_example");
  });

  it("converts to kebab-case from PascalCase", () => {
    expect(convertCase("HelloWorldExample", { target: "kebab" })).toBe("hello-world-example");
  });

  it("converts to CONSTANT_CASE", () => {
    expect(convertCase("hello world", { target: "constant" })).toBe("HELLO_WORLD");
  });

  it("converts to Title Case", () => {
    expect(convertCase("hello_world", { target: "title" })).toBe("Hello World");
  });

  it("converts to Sentence case", () => {
    expect(convertCase("HELLO WORLD EXAMPLE", { target: "sentence" })).toBe("Hello world example");
  });

  it("converts to UPPER and lower case", () => {
    expect(convertCase("Hello World", { target: "upper" })).toBe("HELLO WORLD");
    expect(convertCase("Hello World", { target: "lower" })).toBe("hello world");
  });

  it("returns empty string for empty/whitespace input", () => {
    expect(convertCase("   ", { target: "camel" })).toBe("");
  });
});
