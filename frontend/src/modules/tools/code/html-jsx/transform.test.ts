import { describe, expect, it } from "vitest";
import { htmlToJsx } from "./transform";
import type { HtmlJsxOptions } from "./schema";

const base: HtmlJsxOptions = { selfClosingVoidElements: true };

describe("htmlToJsx", () => {
  it("returns empty output for empty/whitespace input", () => {
    expect(htmlToJsx("   ", base)).toEqual({ output: "", error: null });
  });

  it("converts class to className", () => {
    const result = htmlToJsx('<div class="wrapper">hi</div>', base);
    expect(result.output).toBe('<div className="wrapper">hi</div>');
  });

  it("converts for to htmlFor", () => {
    const result = htmlToJsx('<label for="email">Email</label>', base);
    expect(result.output).toBe('<label htmlFor="email">Email</label>');
  });

  it("converts kebab-case attributes to camelCase", () => {
    const result = htmlToJsx('<svg stroke-width="2"></svg>', base);
    expect(result.output).toBe('<svg strokeWidth="2"></svg>');
  });

  it("leaves data-* and aria-* attributes untouched", () => {
    const result = htmlToJsx('<div data-test-id="x" aria-label="y"></div>', base);
    expect(result.output).toBe('<div data-test-id="x" aria-label="y"></div>');
  });

  it("converts inline style attributes into style objects", () => {
    const result = htmlToJsx('<p style="color:red;font-size:12px">hi</p>', base);
    expect(result.output).toBe("<p style={{ color: 'red', fontSize: '12px' }}>hi</p>");
  });

  it("self-closes void elements when the option is enabled", () => {
    const result = htmlToJsx('<img src="a.png"><br>', base);
    expect(result.output).toBe('<img src="a.png" /><br />');
  });

  it("leaves void elements open when the option is disabled", () => {
    const result = htmlToJsx("<br>", { selfClosingVoidElements: false });
    expect(result.output).toBe("<br>");
  });

  it("keeps boolean attributes bare", () => {
    const result = htmlToJsx("<button disabled>Go</button>", base);
    expect(result.output).toBe("<button disabled>Go</button>");
  });

  it("converts HTML comments to JSX comments", () => {
    const result = htmlToJsx("<!-- todo: remove --><div>x</div>", base);
    expect(result.output).toBe("{/* todo: remove */}<div>x</div>");
  });

  it("preserves already self-closed tags", () => {
    const result = htmlToJsx('<input type="text" />', base);
    expect(result.output).toBe('<input type="text" />');
  });

  it("handles nested elements", () => {
    const result = htmlToJsx('<div class="outer"><span class="inner">text</span></div>', base);
    expect(result.output).toBe('<div className="outer"><span className="inner">text</span></div>');
  });

  it("converts maxlength and tabindex to their camelCase equivalents", () => {
    const result = htmlToJsx('<input maxlength="10" tabindex="0">', base);
    expect(result.output).toBe('<input maxLength="10" tabIndex="0" />');
  });
});
