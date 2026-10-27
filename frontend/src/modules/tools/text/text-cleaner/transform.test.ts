import { describe, expect, it } from "vitest";
import { cleanText } from "./transform";

const off = {
  trimLines: false, collapseSpaces: false, removeEmptyLines: false, collapseEmptyLines: false,
  stripHtml: false, removeAccents: false, straightenQuotes: false, removeInvisible: false,
};

describe("cleanText", () => {
  it("does nothing when every option is off (apart from newline normalisation)", () => {
    expect(cleanText("a  b\r\n c ", off).output).toBe("a  b\n c ");
  });
  it("trims lines and collapses spaces", () => {
    expect(cleanText("  a   b  \n\t c", { ...off, trimLines: true, collapseSpaces: true }).output).toBe("a b\nc");
  });
  it("removes or collapses empty lines", () => {
    expect(cleanText("a\n\n \nb", { ...off, removeEmptyLines: true }).output).toBe("a\nb");
    expect(cleanText("a\n\n\n\n\nb", { ...off, collapseEmptyLines: true }).output).toBe("a\n\nb");
  });
  it("strips tags, scripts and common entities", () => {
    expect(cleanText("<p>Hi&nbsp;<b>there</b> &amp; bye</p><script>x()</script>end", { ...off, stripHtml: true }).output).toBe("Hi there & bye\nend");
  });
  it("removes accents", () => {
    expect(cleanText("Crème brûlée, naïve", { ...off, removeAccents: true }).output).toBe("Creme brulee, naive");
  });
  it("straightens smart punctuation", () => {
    expect(cleanText("“Hi” – it’s…", { ...off, straightenQuotes: true }).output).toBe('"Hi" - it\'s...');
  });
  it("removes zero-width characters and non-breaking spaces", () => {
    expect(cleanText("a\u200Bb\uFEFFc\u00A0d", { ...off, removeInvisible: true }).output).toBe("abc d");
  });
  it("handles empty input", () => {
    expect(cleanText("", off)).toEqual({ output: "", error: null });
  });
});

describe("cleanText line breaks", () => {
  it("turns <br> into a newline", () => {
    expect(cleanText("a<br>b<br/>c", { ...off, stripHtml: true }).output).toBe("a\nb\nc");
  });
});
