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

  it("splits acronyms followed by words", () => {
    expect(convertCase("XMLHttpRequest", { target: "snake" })).toBe("xml_http_request");
    expect(convertCase("parseHTMLString", { target: "kebab" })).toBe("parse-html-string");
    expect(convertCase("userID", { target: "constant" })).toBe("USER_ID");
  });

  it("treats punctuation as a separator for identifier cases", () => {
    expect(convertCase("user.first-name (primary)", { target: "camel" })).toBe("userFirstNamePrimary");
    expect(convertCase("Ünïcode wörds", { target: "snake" })).toBe("ünïcode_wörds");
  });
});

describe("convertCase options", () => {
  it("adds dot, path and Train cases", () => {
    expect(convertCase("helloWorld", { target: "dot" })).toBe("hello.world");
    expect(convertCase("helloWorld", { target: "path" })).toBe("hello/world");
    expect(convertCase("hello_world", { target: "train" })).toBe("Hello-World");
  });

  it("converts each line separately", () => {
    expect(convertCase("first_name\n\nlast_name", { target: "camel", perLine: true })).toBe("firstName\n\nlastName");
    expect(convertCase("first_name\nlast_name", { target: "camel" })).toBe("firstNameLastName");
  });

  it("can preserve acronyms", () => {
    expect(convertCase("user_ID_URL", { target: "camel", preserveAcronyms: true })).toBe("userIDURL");
    expect(convertCase("xml parser for API", { target: "pascal", preserveAcronyms: true })).toBe("XmlParserForAPI");
    expect(convertCase("user_ID", { target: "camel" })).toBe("userId");
  });

  it("can split digits into their own words", () => {
    expect(convertCase("version2Update", { target: "snake" })).toBe("version2_update");
    expect(convertCase("version2Update", { target: "snake", splitDigits: true })).toBe("version_2_update");
  });

  it("smart title case keeps minor words lower-case except at the ends", () => {
    expect(convertCase("the lord of the rings", { target: "title", smartTitle: true })).toBe("The Lord of the Rings");
    expect(convertCase("what are you looking for", { target: "title", smartTitle: true })).toBe("What Are You Looking For");
    expect(convertCase("the lord of the rings", { target: "title" })).toBe("The Lord Of The Rings");
  });
});

