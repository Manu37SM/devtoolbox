import { describe, expect, it } from "vitest";
import { formatXml } from "./transform";

describe("formatXml", () => {
  it("formats a minified XML document with indentation", () => {
    const result = formatXml("<root><a>1</a><b>2</b></root>", { indent: 2 });
    expect(result.error).toBeNull();
    expect(result.output).toBe("<root>\n  <a>1</a>\n  <b>2</b>\n</root>");
  });

  it("preserves attributes", () => {
    const result = formatXml('<root id="5"><a>1</a></root>', { indent: 2 });
    expect(result.output).toBe('<root id="5">\n  <a>1</a>\n</root>');
  });

  it("supports a 4-space indent", () => {
    const result = formatXml("<root><a>1</a></root>", { indent: 4 });
    expect(result.output).toBe("<root>\n    <a>1</a>\n</root>");
  });

  it("returns empty output for empty input", () => {
    expect(formatXml("", { indent: 2 })).toEqual({ output: "", error: null });
  });

  it("returns an error for malformed/unclosed XML", () => {
    const result = formatXml("<root><a></root>", { indent: 2 });
    expect(result.output).toBe("");
    expect(result.error).not.toBeNull();
  });

  it("strips comments and the XML prolog", () => {
    const result = formatXml('<?xml version="1.0"?><!-- comment --><root><a>1</a></root>', { indent: 2 });
    expect(result.output).toBe("<root>\n  <a>1</a>\n</root>");
  });
});
