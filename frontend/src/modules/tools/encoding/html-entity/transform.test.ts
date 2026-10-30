import { describe, expect, it } from "vitest";
import { transformHtmlEntity } from "./transform";

describe("transformHtmlEntity", () => {
  it("encodes reserved HTML characters", () => {
    const result = transformHtmlEntity('<div class="a">Tom & Jerry\'s</div>', { mode: "encode", encodeAllNonAscii: false, entityStyle: "basic", escapeQuotes: true });
    expect(result.output).toBe(
      "&lt;div class=&quot;a&quot;&gt;Tom &amp; Jerry&#39;s&lt;/div&gt;",
    );
  });

  it("decodes named entities", () => {
    const result = transformHtmlEntity("&lt;b&gt;bold&lt;/b&gt;", { mode: "decode", encodeAllNonAscii: false, entityStyle: "basic", escapeQuotes: true });
    expect(result.output).toBe("<b>bold</b>");
  });

  it("decodes numeric decimal and hex references", () => {
    const result = transformHtmlEntity("&#65;&#x42;", { mode: "decode", encodeAllNonAscii: false, entityStyle: "basic" as const, escapeQuotes: true });
    expect(result.output).toBe("AB");
  });

  it("optionally encodes non-ASCII characters numerically", () => {
    const result = transformHtmlEntity("café", { mode: "encode", encodeAllNonAscii: true, entityStyle: "basic" as const, escapeQuotes: true });
    expect(result.output).toBe("caf&#233;");
  });

  it("leaves non-ASCII untouched when the option is off", () => {
    const result = transformHtmlEntity("café", { mode: "encode", encodeAllNonAscii: false, entityStyle: "basic" as const, escapeQuotes: true });
    expect(result.output).toBe("café");
  });

  it("returns empty output for empty input", () => {
    expect(transformHtmlEntity("", { mode: "encode", encodeAllNonAscii: false, entityStyle: "basic" as const, escapeQuotes: true })).toEqual({
      output: "",
      error: null,
    });
  });

  it("leaves unknown entity-like text unchanged on decode", () => {
    const result = transformHtmlEntity("A & B (no entity)", { mode: "decode", encodeAllNonAscii: false, entityStyle: "basic", escapeQuotes: true });
    expect(result.output).toBe("A & B (no entity)");
  });

  const encode = { mode: "encode" as const, encodeAllNonAscii: true, entityStyle: "basic" as const, escapeQuotes: true };

  it("decodes Latin-1, typographic and symbol entities", () => {
    expect(transformHtmlEntity("&copy; 2026 &ndash; &euro;5 &hellip; &rsquo;quoted&rsquo; caf&eacute; &nbsp;|", { ...encode, mode: "decode" }).output).toBe(
      "© 2026 – €5 … ’quoted’ café \u00a0|",
    );
    expect(transformHtmlEntity("&unknown; &amp", { ...encode, mode: "decode" }).output).toBe("&unknown; &amp");
  });

  it("encodes with named, decimal or hex references", () => {
    expect(transformHtmlEntity("<é €>", encode).output).toBe("&lt;&#233; &#8364;&gt;");
    expect(transformHtmlEntity("<é €>", { ...encode, entityStyle: "named" }).output).toBe("&lt;&eacute; &euro;&gt;");
    expect(transformHtmlEntity("<é>", { ...encode, entityStyle: "decimal" }).output).toBe("&#60;&#233;&#62;");
    expect(transformHtmlEntity("<é>", { ...encode, entityStyle: "hex" }).output).toBe("&#x3C;&#xE9;&#x3E;");
    expect(transformHtmlEntity("𝄞", { ...encode, entityStyle: "named" }).output).toBe("&#119070;");
  });

  it("leaves quotes alone when not encoding for an attribute", () => {
    expect(transformHtmlEntity(`He said "it's" <ok>`, { ...encode, escapeQuotes: false }).output).toBe(`He said "it's" &lt;ok&gt;`);
  });
});

