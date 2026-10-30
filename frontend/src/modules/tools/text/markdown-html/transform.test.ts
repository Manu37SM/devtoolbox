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

  it("keeps emphasis markers literal inside code spans", () => {
    expect(markdownToHtml("`a**b**c` and `_x_`")).toBe("<p><code>a**b**c</code> and <code>_x_</code></p>");
  });

  it("supports link titles and keeps ordered-list start numbers", () => {
    expect(markdownToHtml('[a](https://x.dev "Home")')).toBe('<p><a href="https://x.dev" title="Home">a</a></p>');
    expect(markdownToHtml("3. c\n4. d")).toBe('<ol start="3"><li>c</li><li>d</li></ol>');
  });
});

describe("markdownToHtml options", () => {
  it("renders GFM tables with alignment", () => {
    expect(markdownToHtml("| Name | Qty |\n| :--- | ---: |\n| a | 1 |\n| b\\|c | 2 |")).toBe(
      '<table><thead><tr><th style="text-align:left">Name</th><th style="text-align:right">Qty</th></tr></thead>' +
        '<tbody><tr><td style="text-align:left">a</td><td style="text-align:right">1</td></tr>' +
        '<tr><td style="text-align:left">b|c</td><td style="text-align:right">2</td></tr></tbody></table>',
    );
  });

  it("renders task lists, strikethrough and bare URLs, and turns GFM off on request", () => {
    expect(markdownToHtml("- [x] done\n- [ ] todo")).toBe(
      '<ul><li class="task-list-item"><input type="checkbox" disabled checked /> done</li><li class="task-list-item"><input type="checkbox" disabled /> todo</li></ul>',
    );
    expect(markdownToHtml("~~old~~ see https://example.com/a?b=1&c=2.")).toBe(
      '<p><del>old</del> see <a href="https://example.com/a?b=1&amp;c=2">https://example.com/a?b=1&amp;c=2</a>.</p>',
    );
    expect(markdownToHtml("~~old~~ https://x.dev", { gfm: false })).toBe("<p>~~old~~ https://x.dev</p>");
  });

  it("adds GitHub-style heading ids, de-duplicated", () => {
    expect(markdownToHtml("# Hello, World!\n## Hello, World!", { headingIds: true })).toBe(
      '<h1 id="hello-world">Hello, World!</h1>\n<h2 id="hello-world-1">Hello, World!</h2>',
    );
  });

  it("supports hard line breaks and external links", () => {
    expect(markdownToHtml("a\nb", { hardBreaks: true })).toBe("<p>a<br />\nb</p>");
    expect(markdownToHtml("[x](https://x.dev)", { externalLinks: true })).toBe(
      '<p><a href="https://x.dev" target="_blank" rel="noopener noreferrer">x</a></p>',
    );
  });

  it("neutralises script URLs by default", () => {
    expect(markdownToHtml("[x](javascript:alert(1))")).not.toContain("javascript:");
    expect(markdownToHtml("[x](JavaScript:alert)")).toBe('<p><a href="#">x</a></p>');
    expect(markdownToHtml("![i](data:image/png;base64,AAAA)")).toContain('src="data:image/png;base64,AAAA"');
    expect(markdownToHtml("[x](data:text/html,hi)")).toBe('<p><a href="#">x</a></p>');
    expect(markdownToHtml("[x](javascript:alert)", { safeUrls: false })).toContain('href="javascript:alert"');
  });

  it("wraps a full document titled by the first h1", () => {
    const doc = markdownToHtml("# My *Doc*\n\ntext", { fullDocument: true });
    expect(doc.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(doc).toContain("<title>My Doc</title>");
    expect(doc).toContain("<p>text</p>\n</body>");
  });
});

