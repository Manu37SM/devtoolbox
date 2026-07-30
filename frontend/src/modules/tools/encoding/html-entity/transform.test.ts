import { describe, expect, it } from "vitest";
import { transformHtmlEntity } from "./transform";

describe("transformHtmlEntity", () => {
  it("encodes reserved HTML characters", () => {
    const result = transformHtmlEntity('<div class="a">Tom & Jerry\'s</div>', {
      mode: "encode",
      encodeAllNonAscii: false,
    });
    expect(result.output).toBe(
      "&lt;div class=&quot;a&quot;&gt;Tom &amp; Jerry&#39;s&lt;/div&gt;",
    );
  });

  it("decodes named entities", () => {
    const result = transformHtmlEntity("&lt;b&gt;bold&lt;/b&gt;", {
      mode: "decode",
      encodeAllNonAscii: false,
    });
    expect(result.output).toBe("<b>bold</b>");
  });

  it("decodes numeric decimal and hex references", () => {
    const result = transformHtmlEntity("&#65;&#x42;", { mode: "decode", encodeAllNonAscii: false });
    expect(result.output).toBe("AB");
  });

  it("optionally encodes non-ASCII characters numerically", () => {
    const result = transformHtmlEntity("café", { mode: "encode", encodeAllNonAscii: true });
    expect(result.output).toBe("caf&#233;");
  });

  it("leaves non-ASCII untouched when the option is off", () => {
    const result = transformHtmlEntity("café", { mode: "encode", encodeAllNonAscii: false });
    expect(result.output).toBe("café");
  });

  it("returns empty output for empty input", () => {
    expect(transformHtmlEntity("", { mode: "encode", encodeAllNonAscii: false })).toEqual({
      output: "",
      error: null,
    });
  });

  it("leaves unknown entity-like text unchanged on decode", () => {
    const result = transformHtmlEntity("A & B (no entity)", {
      mode: "decode",
      encodeAllNonAscii: false,
    });
    expect(result.output).toBe("A & B (no entity)");
  });
});
