import { describe, expect, it } from "vitest";
import { convertNotes, freqToMidiFloat, midiName, midiToFreq, noteToMidi } from "./transform";

const o = { a4: 440, accidentals: "sharp" as const, speedOfSound: true };

describe("conversions", () => {
  it("maps note names to MIDI (A4=69, C4=60, C-1=0)", () => {
    expect(noteToMidi("A4")).toBe(69);
    expect(noteToMidi("C4")).toBe(60);
    expect(noteToMidi("C-1")).toBe(0);
    expect(noteToMidi("Bb3")).toBe(58);
    expect(noteToMidi("C#4")).toBe(61);
    expect(noteToMidi("B♭3")).toBe(58);
    expect(() => noteToMidi("H4")).toThrow();
  });
  it("matches standard equal-temperament frequencies", () => {
    expect(midiToFreq(69, 440)).toBe(440);
    expect(midiToFreq(60, 440)).toBeCloseTo(261.6256, 3);
    expect(midiToFreq(81, 440)).toBeCloseTo(880, 9);
    expect(midiToFreq(69, 432)).toBe(432);
    expect(freqToMidiFloat(880, 440)).toBeCloseTo(81, 9);
  });
  it("names MIDI notes with sharps or flats", () => {
    expect(midiName(61, false)).toBe("C#4");
    expect(midiName(61, true)).toBe("Db4");
  });
});

describe("convertNotes", () => {
  it("converts a note", () => {
    const r = convertNotes("A4", o).output;
    expect(r).toContain("Frequency:  440.000 Hz");
    expect(r).toContain("MIDI:       69");
    expect(r).toContain("Wavelength: 78.0 cm");
  });
  it("finds the nearest note and cents offset for a frequency", () => {
    const r = convertNotes("450 Hz", o).output;
    expect(r).toContain("A4  (+38.9 cents)");
  });
  it("accepts MIDI numbers and a custom reference pitch", () => {
    expect(convertNotes("midi 60", o).output).toContain("C4");
    expect(convertNotes("A4", { ...o, a4: 432 }).output).toContain("432.000 Hz");
    expect(convertNotes("midi 61", { ...o, accidentals: "flat" }).output).toContain("Db4");
  });
  it("reports bad lines", () => {
    const r = convertNotes("A4\nzzz\nmidi 200\n0.5", o);
    expect(r.error?.line).toBe(2);
    expect(r.output).toContain("MIDI notes range");
    expect(r.output).toContain("between 1 and 30,000");
    expect(convertNotes("", o)).toEqual({ output: "", error: null });
  });
});
