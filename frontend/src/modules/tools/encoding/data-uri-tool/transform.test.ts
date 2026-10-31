import { describe, expect, it } from "vitest";
import { dataUriTool, parseDataUri } from "./transform";

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#f00"/></svg>';
const SVG_B64 = "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjAwIi8+PC9zdmc+";

describe("dataUriTool build", () => {
  it("builds base64 (value from Python base64)", () => {
    expect(dataUriTool("héllo", { mime: "text/plain", encoding: "base64" }).output).toBe("data:text/plain;charset=utf-8;base64,aMOpbGxv");
  });
  it("builds percent-encoded output that escapes # < > and quotes", () => {
    const out = dataUriTool(SVG, { mime: "image/svg+xml", encoding: "percent" }).output;
    expect(out.startsWith("data:image/svg+xml;charset=utf-8,%3Csvg")).toBe(true);
    expect(out).toContain("fill=%22%23f00%22");
    expect(out).not.toMatch(/[<>" #]/);
    expect(parseDataUri(out).bytes).toEqual(new TextEncoder().encode(SVG));
  });
  it("auto picks the shorter form", () => {
    expect(dataUriTool("hello world", { encoding: "auto" }).output).not.toContain(";base64");
    expect(dataUriTool("<<<<<<<<<<<<<<<<<<<<<<<<<<", { encoding: "auto", mime: "text/html" }).output).toContain(";base64");
    expect(dataUriTool(SVG, { mime: "image/svg+xml", includeCharset: false, encoding: "base64" }).output).toBe(`data:image/svg+xml;base64,${SVG_B64}`);
  });
  it("only adds a charset to text-like types", () => {
    expect(dataUriTool("x", { mime: "image/png", encoding: "base64" }).output).toBe("data:image/png;base64,eA==");
    expect(dataUriTool("x", { mime: "application/json", encoding: "base64" }).output).toContain("charset=utf-8");
  });
  it("minifies whitespace and supports url-safe base64", () => {
    expect(parseDataUri(dataUriTool("<a>\n  <b/>\n</a>", { minify: true, mime: "text/xml", encoding: "percent" }).output).bytes).toEqual(new TextEncoder().encode("<a><b/></a>"));
    expect(dataUriTool("???>>>", { encoding: "base64", urlSafe: true, includeCharset: false }).output).toBe("data:text/plain;base64,Pz8_Pj4-");
  });
  it("wraps for CSS, HTML, Markdown and JS", () => {
    expect(dataUriTool("x", { mime: "image/png", encoding: "base64", wrap: "css-url" }).output).toBe('url("data:image/png;base64,eA==")');
    expect(dataUriTool("x", { mime: "image/png", encoding: "base64", wrap: "html-img" }).output).toBe('<img src="data:image/png;base64,eA==" alt="">');
    expect(dataUriTool("x", { mime: "image/png", encoding: "base64", wrap: "markdown-img" }).output).toBe("![](data:image/png;base64,eA==)");
    expect(dataUriTool("x", { mime: "image/png", encoding: "base64", wrap: "js-string" }).output).toBe('"data:image/png;base64,eA=="');
  });
});

describe("dataUriTool parse", () => {
  it("parses percent-encoded text (Python unquote_to_bytes)", () => {
    const out = dataUriTool("data:text/plain;charset=utf-8,Hello%20W%C3%B6rld%21", { mode: "parse" }).output;
    expect(out).toContain("Media type: text/plain");
    expect(out).toContain("charset=utf-8");
    expect(out).toContain("Hello Wörld!");
    expect(out).toContain("Size:       13 bytes");
  });
  it("parses base64 and shows binary as hex", () => {
    expect(dataUriTool(`data:image/svg+xml;base64,${SVG_B64}`, { mode: "parse" }).output).toContain(SVG);
    const bin = dataUriTool("data:image/png;base64,iVBORw0KGgo=", { mode: "parse" }).output;
    expect(bin).toContain("89 50 4e 47 0d 0a 1a 0a");
  });
  it("defaults the media type per RFC 2397 and rejects junk", () => {
    expect(parseDataUri("data:,hi").mediaType).toBe("text/plain");
    expect(dataUriTool("http://x", { mode: "parse" }).error).not.toBeNull();
    expect(dataUriTool("data:text/plain;base64,@@@", { mode: "parse" }).error?.message).toMatch(/base64/);
    expect(dataUriTool("data:nonsense,x", { mode: "parse" }).error?.message).toMatch(/media type/);
  });
});
