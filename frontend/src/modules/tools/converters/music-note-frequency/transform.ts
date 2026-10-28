import type { TransformResult } from "@/lib/tool-transform";
import type { MusicNoteFrequencyOptions } from "./schema";

const SEMI: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

export const midiToFreq = (midi: number, a4: number) => a4 * Math.pow(2, (midi - 69) / 12);
export const freqToMidiFloat = (f: number, a4: number) => 69 + 12 * Math.log2(f / a4);
export const midiName = (midi: number, flat: boolean) => `${(flat ? FLAT : SHARP)[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 1}`;

export function noteToMidi(name: string): number {
  const m = /^([A-Ga-g])([#♯b♭]?)(-?\d+)$/.exec(name.trim());
  if (!m) throw new Error(`Cannot read "${name}"`);
  const acc = m[2] === "#" || m[2] === "♯" ? 1 : m[2] === "b" || m[2] === "♭" ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + SEMI[m[1]!.toUpperCase()]! + acc;
}

/** Each line: a note (A4, C#3, Bb2), a frequency (440, 261.63 Hz) or a MIDI number (midi 60). */
export function convertNotes(input: string, o: MusicNoteFrequencyOptions): TransformResult {
  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
  if (!lines.length) return { output: "", error: null };
  const out: string[] = [];
  let firstErr: { message: string; line?: number } | null = null;
  lines.forEach((l, i) => {
    try {
      let midi: number, freq: number, cents = 0;
      const mm = /^(?:midi|m)\s*:?\s*(\d+)$/i.exec(l);
      const fm = /^(\d+(?:\.\d+)?)\s*(?:hz)?$/i.exec(l);
      if (mm) { midi = Number(mm[1]); if (midi > 127) throw new Error("MIDI notes range from 0 to 127"); freq = midiToFreq(midi, o.a4); }
      else if (fm) {
        freq = Number(fm[1]);
        if (freq < 1 || freq > 30000) throw new Error("Frequency must be between 1 and 30,000 Hz");
        const mf = freqToMidiFloat(freq, o.a4);
        midi = Math.round(mf);
        cents = (mf - midi) * 100;
      } else { midi = noteToMidi(l); freq = midiToFreq(midi, o.a4); }
      if (midi < 0 || midi > 127) throw new Error(`MIDI ${midi} is outside the standard 0–127 range`);
      const flat = o.accidentals === "flat";
      const rows = [`Note:       ${midiName(midi, flat)}${fm && Math.abs(cents) >= 0.5 ? `  (${cents > 0 ? "+" : ""}${cents.toFixed(1)} cents)` : ""}`, `MIDI:       ${midi}`, `Frequency:  ${freq.toFixed(3)} Hz`];
      if (o.speedOfSound) rows.push(`Wavelength: ${((343 / freq) * 100).toFixed(1)} cm (air, 20 °C)`);
      out.push(`${l}\n${rows.map((r) => "  " + r).join("\n")}`);
    } catch (e) {
      firstErr ??= { message: `Line ${i + 1}: ${(e as Error).message}`, line: i + 1 };
      out.push(`${l}\n  ✗ ${(e as Error).message}`);
    }
  });
  return { output: out.join("\n\n"), error: firstErr };
}
