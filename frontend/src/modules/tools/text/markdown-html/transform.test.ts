import { describe, expect, it } from "vitest";
import { markdownToHtml } from "./transform";

describe("markdownToHtml", () => {
  it("converts headings", () => {
    expect(markdownToHtml("# Title")).toBe("<h1>Title</h1>");
    expect(markdownToHtml("### Sub")).toBe("<h3>Sub</h3>");
  });

  it("converts a paragraph", () => {
    expect(markdownToHtml("Hello world")).toBe("<p>Hello world</p>");
  });

  it("converts bold and italic", () => {
    expect(markdownToHtml("**bold** and *italic*")).toBe("<p><strong>bold</strong> and <em>italic</em></p>");
  });

  it("converts inline code", () => {
    expect(markdownToHtml("Use `const x = 1`")).toBe("<p>Use <code>const x = 1</code></p>");
  });

  it("converts links", () => {
    expect(markdownToHtml("[DevToolbox](https://example.com)")).toBe(
      '<p><a href="https://example.com">DevToolbox</a></p>',
    );
  });

  it("converts images", () => {
    expect(markdownToHtml("![alt text](https://example.com/img.png)")).toBe(
      '<p><img src="https://example.com/img.png" alt="alt text" /></p>',
    );
  });

  it("converts unordered lists", () => {
    expect(markdownToHtml("- a\n- b\n- c")).toBe("<ul><li>a</li><li>b</li><li>c</li></ul>");
  });

  it("converts ordered lists", () => {
    expect(markdownToHtml("1. a\n2. b")).toBe("<ol><li>a</li><li>b</li></ol>");
  });

  it("converts blockquotes", () => {
    expect(markdownToHtml("> quoted text")).toBe("<blockquote><p>quoted text</p></blockquote>");
  });

  it("converts fenced code blocks with a language class", () => {
    expect(markdownToHtml("```js\nconst x = 1;\n```")).toBe(
      '<pre><code class="language-js">const x = 1;</code></pre>',
    );
  });

  it("converts a horizontal rule", () => {
    expect(markdownToHtml("---")).toBe("<hr />");
  });

  it("escapes HTML-significant characters", () => {
    expect(markdownToHtml("<script>alert(1)</script>")).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
  });

  it("returns empty string for empty/whitespace input", () => {
    expect(markdownToHtml("   ")).toBe("");
  });

  it("handles multiple paragraphs separated by blank lines", () => {
    expect(markdownToHtml("Para one.\n\nPara two.")).toBe("<p>Para one.</p>\n<p>Para two.</p>");
  });
});
