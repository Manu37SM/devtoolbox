import { describe, expect, it } from "vitest";
import { convertMorse, morseTimings, morseToText, morseToWav, textToMorse } from "./transform";

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

describe("morse options", () => {
  const enc = (s: string, o = {}) => convertMorse(s, { mode: "text-to-morse", ...o });
  const dec = (s: string, o = {}) => convertMorse(s, { mode: "morse-to-text", ...o });

  it("writes symbols and word separators in several styles", () => {
    expect(enc("SOS HI", { symbols: "unicode" }).output).toBe("··· −−− ··· / ···· ··");
    expect(enc("AN", { symbols: "ditdah" }).output).toBe("dit-dah  dah-dit");
    expect(enc("A B", { wordSeparator: "spaces" }).output).toBe(".-   -...");
    expect(enc("A B", { wordSeparator: "newline" }).output).toBe(".-\n-...");
  });

  it("decodes the same styles back", () => {
    expect(dec("··· −−− ···").output).toBe("SOS");
    expect(dec("dit-dah  dah-dit").output).toBe("AN");
  });

  it("handles unsupported characters", () => {
    expect(enc("a#b").error?.message).toBe("No Morse code for: #");
    expect(enc("a#b", { unsupported: "skip" }).output).toBe(".- -...");
    expect(enc("a#b", { unsupported: "question" }).output).toBe(".- ..--.. -...");
    expect(dec(".- ......... -...", { unsupported: "question" }).output).toBe("A?B");
  });

  it("supports extended letters and prosigns", () => {
    expect(enc("Ñé").error).not.toBeNull();
    expect(enc("Ñé", { extended: true }).output).toBe("--.-- ..-..");
    expect(enc("<SOS> <AR>", { extended: true }).output).toBe("...---... / .-.-.");
    expect(dec("..-.. ...---...", { extended: true }).output).toBe("É<SOS>");
  });
});

describe("morseTimings", () => {
  it("follows the PARIS standard", () => {
    // PARIS + one word gap is exactly 50 dot units, so 20 wpm = 60 ms per dot.
    const t = morseTimings(".--. .- .-. .. ... / ", 20);
    expect(t[0]).toEqual({ on: true, ms: 60 });
    const units = t.reduce((s, x) => s + x.ms, 0) / 60;
    expect(units).toBe(43); // 50 minus the trailing 7-unit word gap
  });

  it("stretches only the gaps with Farnsworth spacing", () => {
    const fast = morseTimings(".- / .-", 20, 20);
    const slow = morseTimings(".- / .-", 20, 10);
    expect(slow.filter((s) => s.on)).toEqual(fast.filter((s) => s.on));
    expect(slow.find((s) => !s.on && s.ms > 300)!.ms).toBeGreaterThan(fast.find((s) => !s.on && s.ms > 300)!.ms);
  });

  it("renders a valid WAV", () => {
    const wav = morseToWav(morseTimings("."), 600, 8000);
    expect(new TextDecoder().decode(wav.slice(0, 4))).toBe("RIFF");
    expect(wav.length).toBe(44 + 2 * Math.round(0.06 * 8000));
  });
});

