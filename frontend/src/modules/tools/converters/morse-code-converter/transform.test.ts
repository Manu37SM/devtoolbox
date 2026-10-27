import { describe, expect, it } from "vitest";
import { convertMorse, morseToText, textToMorse } from "./transform";

describe("textToMorse", () => {
  it("encodes letters with spaces and words with ' / '", () => {
    expect(textToMorse("SOS").output).toBe("... --- ...");
    expect(textToMorse("hello world").output).toBe(".... . .-.. .-.. --- / .-- --- .-. .-.. -..");
  });

  it("encodes digits and punctuation", () => {
    expect(textToMorse("42?").output).toBe("....- ..--- ..--..");
  });

  it("reports unsupported characters", () => {
    const r = textToMorse("hi ☃");
    expect(r.output).toBe("");
    expect(r.error?.message).toContain("☃");
  });
});

describe("morseToText", () => {
  it("decodes with slash, pipe or wide-space word separators", () => {
    expect(morseToText(".... .. / - .... . .-. .").output).toBe("HI THERE");
    expect(morseToText(".... ..   |  ... --- ...").output).toBe("HI SOS");
    expect(morseToText(".... ..    ... --- ...").output).toBe("HI SOS");
  });

  it("accepts typographic dots and dashes", () => {
    expect(morseToText("··· ——— ···").output).toBe("SOS");
  });

  it("errors on unknown sequences and stray characters", () => {
    expect(morseToText("......-.").error).not.toBeNull();
    expect(morseToText("... abc").error).not.toBeNull();
  });
});

describe("convertMorse", () => {
  it("returns empty output for empty input in both modes", () => {
    expect(convertMorse("  ", { mode: "text-to-morse" })).toEqual({ output: "", error: null });
    expect(convertMorse("", { mode: "morse-to-text" })).toEqual({ output: "", error: null });
  });

  it("round-trips", () => {
    const encoded = convertMorse("Meet at 9pm.", { mode: "text-to-morse" }).output;
    expect(convertMorse(encoded, { mode: "morse-to-text" }).output).toBe("MEET AT 9PM.");
  });
});
