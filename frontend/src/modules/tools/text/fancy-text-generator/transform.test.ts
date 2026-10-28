import { describe, expect, it } from "vitest";
import { generateFancyText, mapChar, stylize } from "./transform";

describe("stylize", () => {
  it("maps bold, sans and monospace letters and digits", () => {
    expect(stylize("Hello 123", "bold")).toBe("𝐇𝐞𝐥𝐥𝐨 𝟏𝟐𝟑");
    expect(stylize("Az", "sansBold")).toBe("𝗔𝘇");
    expect(stylize("a1", "monospace")).toBe("𝚊𝟷");
  });
  it("fills the Letterlike-Symbols holes", () => {
    expect(mapChar("h", "italic")).toBe("ℎ");
    expect(mapChar("B", "script")).toBe("ℬ");
    expect(mapChar("e", "script")).toBe("ℯ");
    expect(mapChar("R", "fraktur")).toBe("ℜ");
    expect(mapChar("N", "doubleStruck")).toBe("ℕ");
    expect(stylize("Reals", "doubleStruck")).toBe("ℝ𝕖𝕒𝕝𝕤");
  });
  it("leaves unsupported characters untouched", () => {
    expect(stylize("a-b é!", "bold")).toBe("𝐚-𝐛 é!");
    expect(stylize("5", "italic")).toBe("5");
  });
  it("circled, fullwidth and small caps", () => {
    expect(stylize("Ab1 0", "circled")).toBe("Ⓐⓑ① ⓪");
    expect(stylize("Hi 1!", "fullwidth")).toBe("Ｈｉ　１！");
    expect(stylize("Hello", "smallCaps")).toBe("ʜᴇʟʟᴏ");
  });
  it("upside down reverses and flips", () => {
    expect(stylize("hello", "upsideDown")).toBe("ollǝɥ");
    expect(stylize("a?", "upsideDown")).toBe("¿ɐ");
  });
  it("combining-mark styles skip whitespace", () => {
    expect(stylize("a b", "strikethrough")).toBe("a̶ b̶");
    expect(stylize("ab", "underline")).toBe("a̲b̲");
  });
});

describe("generateFancyText", () => {
  it("shows every style, or just one", () => {
    const all = generateFancyText("Hi", { style: "all" }).output.split("\n");
    expect(all).toHaveLength(18);
    expect(all[0]).toContain("Bold");
    expect(generateFancyText("Hi", { style: "bold" }).output).toBe("𝐇𝐢");
    expect(generateFancyText("", { style: "all" }).output).toBe("");
  });
});
