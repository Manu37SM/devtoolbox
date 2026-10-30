import { describe, expect, it } from "vitest";
import { formatXml } from "./transform";
import type { XmlFormatterOptions } from "./schema";

const base: XmlFormatterOptions = {
  indent: 2,
  mode: "beautify",
  stripComments: false,
  sortAttributes: false,
  attributesPerLine: false,
  expandEmpty: false,
};

describe("formatXml", () => {
  it("formats a minified XML document with indentation", () => {
    const result = formatXml("<root><a>1</a><b>2</b></root>", base);
    expect(result.error).toBeNull();
    expect(result.output).toBe("<root>\n  <a>1</a>\n  <b>2</b>\n</root>");
  });

  it("preserves attributes", () => {
    const result = formatXml('<root id="5"><a>1</a></root>', base);
    expect(result.output).toBe('<root id="5">\n  <a>1</a>\n</root>');
  });

  it("supports a 4-space indent and tabs", () => {
    expect(formatXml("<root><a>1</a></root>", { ...base, indent: 4 }).output).toBe("<root>\n    <a>1</a>\n</root>");
    expect(formatXml("<root><a>1</a></root>", { ...base, indent: "tab" }).output).toBe("<root>\n\t<a>1</a>\n</root>");
  });

  it("returns empty output for empty input", () => {
    expect(formatXml("", base)).toEqual({ output: "", error: null });
  });

  it("explains mismatched and unclosed tags with line numbers", () => {
    expect(formatXml("<root>\n<a></root>", base).error?.message).toBe("Expected </a> (opened on line 2) but found </root> on line 2");
    expect(formatXml("<root><a>", base).error?.message).toBe("<a> opened on line 1 is never closed");
    expect(formatXml("<a/><b/>", base).error?.message).toBe("More than one root element");
  });

  it("keeps the declaration, DOCTYPE, comments, CDATA and entities exactly", () => {
    const src = '<?xml version="1.0"?><!DOCTYPE note [<!ENTITY x "y">]><!-- top --><root><!-- c --><a>&amp; &lt;b&gt;</a><s><![CDATA[1 < 2 && "x"]]></s></root>';
    expect(formatXml(src, base).output).toBe(
      '<?xml version="1.0"?>\n<!DOCTYPE note [<!ENTITY x "y">]>\n<!-- top -->\n<root>\n  <!-- c -->\n  <a>&amp; &lt;b&gt;</a>\n  <s><![CDATA[1 < 2 && "x"]]></s>\n</root>',
    );
  });

  it("removes comments on request", () => {
    expect(formatXml('<?xml version="1.0"?><!-- c --><root><a>1</a></root>', { ...base, stripComments: true }).output).toBe(
      '<?xml version="1.0"?>\n<root>\n  <a>1</a>\n</root>',
    );
  });

  it("minifies without touching text content", () => {
    expect(formatXml("<root>\n  <a  id='1'>hello   world</a>\n  <b></b>\n</root>", { ...base, mode: "minify" }).output).toBe(
      "<root><a id='1'>hello world</a><b/></root>",
    );
  });

  it("sorts attributes with namespace declarations first", () => {
    expect(formatXml('<r z="1" xmlns:b="u" a="2" xmlns="d"/>', { ...base, sortAttributes: true }).output).toBe('<r xmlns="d" xmlns:b="u" a="2" z="1" />');
  });

  it("puts attributes on their own lines and expands empty elements on request", () => {
    expect(formatXml('<r><e a="1" b="2"/></r>', { ...base, attributesPerLine: true, expandEmpty: true }).output).toBe(
      '<r>\n  <e\n    a="1"\n    b="2"></e>\n</r>',
    );
  });

  it("keeps multi-line text as an indented block", () => {
    expect(formatXml("<r><p>line one\nline two</p></r>", base).output).toBe("<r>\n  <p>\n    line one\nline two\n  </p>\n</r>");
  });
});
