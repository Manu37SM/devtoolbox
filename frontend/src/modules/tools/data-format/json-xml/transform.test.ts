import { describe, expect, it } from "vitest";
import { convertJsonXml } from "./transform";

const base = { mode: "json-to-xml" as const, indent: 2 as const, rootName: "root" };

describe("convertJsonXml", () => {
  it("converts a simple JSON object to XML", () => {
    const result = convertJsonXml('{"a":"1","b":"2"}', base);
    expect(result.error).toBeNull();
    expect(result.output).toBe("<root>\n  <a>1</a>\n  <b>2</b>\n</root>");
  });

  it("converts attributes prefixed with @_", () => {
    const result = convertJsonXml('{"@_id":"5","#text":"hello"}', base);
    expect(result.output).toBe('<root id="5">hello</root>');
  });

  it("converts arrays to repeated sibling tags", () => {
    const result = convertJsonXml('{"item":["a","b"]}', base);
    expect(result.output).toBe("<root>\n  <item>a</item>\n  <item>b</item>\n</root>");
  });

  it("converts XML to JSON", () => {
    const result = convertJsonXml("<root><a>1</a><b>2</b></root>", { ...base, mode: "xml-to-json" });
    expect(JSON.parse(result.output)).toEqual({ a: "1", b: "2" });
  });

  it("parses XML attributes into @_ prefixed keys", () => {
    const result = convertJsonXml('<root id="5">hello</root>', { ...base, mode: "xml-to-json" });
    expect(JSON.parse(result.output)).toEqual({ "@_id": "5", "#text": "hello" });
  });

  it("groups repeated XML sibling tags into an array", () => {
    const result = convertJsonXml("<root><item>a</item><item>b</item></root>", { ...base, mode: "xml-to-json" });
    expect(JSON.parse(result.output)).toEqual({ item: ["a", "b"] });
  });

  it("round-trips JSON -> XML -> JSON", () => {
    const original = { name: "Widget", price: "9.99" };
    const xml = convertJsonXml(JSON.stringify(original), base);
    const backToJson = convertJsonXml(xml.output, { ...base, mode: "xml-to-json" });
    expect(JSON.parse(backToJson.output)).toEqual(original);
  });

  it("handles self-closing/empty elements", () => {
    const result = convertJsonXml("<root><empty/></root>", { ...base, mode: "xml-to-json" });
    expect(JSON.parse(result.output)).toEqual({ empty: "" });
  });

  it("decodes XML entities", () => {
    const result = convertJsonXml("<root>Tom &amp; Jerry &lt;3&gt;</root>", { ...base, mode: "xml-to-json" });
    expect(JSON.parse(result.output)).toBe("Tom & Jerry <3>");
  });

  it("returns empty output for empty input", () => {
    expect(convertJsonXml("", base)).toEqual({ output: "", error: null });
  });

  it("errors on malformed XML", () => {
    const result = convertJsonXml("<root><a></root>", { ...base, mode: "xml-to-json" });
    expect(result.error).not.toBeNull();
  });

  it("uses the custom root tag name", () => {
    const result = convertJsonXml('{"a":"1"}', { ...base, rootName: "config" });
    expect(result.output).toBe("<config>\n  <a>1</a>\n</config>");
  });
});
