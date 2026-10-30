"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { OutputPane } from "@/components/tools/OutputPane";
import { DualPane } from "@/components/tools/DualPane";
import { Button } from "@/components/ui/button";
import { ToolInput } from "@/components/tools/ToolInput";
import { convertMorse, morseTimings, morseToWav, textToMorse } from "./transform";
import { morseCodeOptionsSchema, type MorseCodeOptions } from "./schema";

const modes: { value: MorseCodeOptions["mode"]; label: string }[] = [
  { value: "text-to-morse", label: "Text → Morse" },
  { value: "morse-to-text", label: "Morse → Text" },
];

const CLS_LABEL = "flex items-center gap-1.5 text-sm text-text-secondary";
const CLS_SELECT = "rounded-sm border border-border-default bg-bg-raised px-1.5 py-1";
const CLS_NUM = "w-16 rounded-sm border border-border-default bg-bg-raised px-1.5 py-1";

export function MorseCodeConverterToolView() {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<MorseCodeOptions>(() => morseCodeOptionsSchema.parse({}));
  const set = <K extends keyof MorseCodeOptions>(k: K, v: MorseCodeOptions[K]) => setOptions((o) => ({ ...o, [k]: v }));

  const result = useMemo(() => convertMorse(input, options), [input, options]);

  // Audio always plays the Morse side, whichever direction is selected.
  const morseForAudio = useMemo(() => {
    if (options.mode === "morse-to-text") return input;
    return textToMorse(input, { ...options, symbols: "ascii", wordSeparator: "slash", unsupported: "skip" }).output;
  }, [input, options]);
  const segments = useMemo(
    () => morseTimings(morseForAudio, options.wpm, Math.min(options.farnsworthWpm, options.wpm)),
    [morseForAudio, options.wpm, options.farnsworthWpm],
  );
  const seconds = segments.reduce((s, x) => s + x.ms, 0) / 1000;

  const audioRef = useRef<AudioContext | null>(null);
  const [playing, setPlaying] = useState(false);
  const stop = () => {
    void audioRef.current?.close();
    audioRef.current = null;
    setPlaying(false);
  };
  useEffect(() => () => void audioRef.current?.close(), []);

  const play = () => {
    stop();
    const ctx = new AudioContext();
    audioRef.current = ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = options.frequency;
    gain.gain.value = 0;
    osc.connect(gain).connect(ctx.destination);
    let t = ctx.currentTime + 0.05;
    for (const seg of segments) {
      const d = seg.ms / 1000;
      if (seg.on) {
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.5, t + 0.005);
        gain.gain.setValueAtTime(0.5, t + d - 0.005);
        gain.gain.linearRampToValueAtTime(0, t + d);
      }
      t += d;
    }
    osc.start();
    osc.stop(t + 0.05);
    osc.onended = () => {
      if (audioRef.current === ctx) stop();
    };
    setPlaying(true);
  };

  const download = () => {
    const wav = morseToWav(segments, options.frequency);
    const url = URL.createObjectURL(new Blob([wav.buffer as ArrayBuffer], { type: "audio/wav" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "morse.wav";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex overflow-hidden rounded-sm border border-border-default">
          {modes.map((m) => (
            <Button
              key={m.value}
              variant={options.mode === m.value ? "primary" : "ghost"}
              size="sm"
              className="rounded-none"
              onClick={() => set("mode", m.value)}
            >
              {m.label}
            </Button>
          ))}
        </div>
        {options.mode === "text-to-morse" && (
          <>
            <label className={CLS_LABEL}>
              Symbols
              <select className={CLS_SELECT} value={options.symbols} onChange={(e) => set("symbols", e.target.value as MorseCodeOptions["symbols"])}>
                <option value="ascii">. -</option>
                <option value="unicode">· −</option>
                <option value="ditdah">dit dah</option>
              </select>
            </label>
            <label className={CLS_LABEL}>
              Word gap
              <select
                className={CLS_SELECT}
                value={options.wordSeparator}
                onChange={(e) => set("wordSeparator", e.target.value as MorseCodeOptions["wordSeparator"])}
              >
                <option value="slash">/</option>
                <option value="pipe">|</option>
                <option value="spaces">3 spaces</option>
                <option value="newline">New line</option>
              </select>
            </label>
          </>
        )}
        <label className={CLS_LABEL}>
          Unknown characters
          <select
            className={CLS_SELECT}
            value={options.unsupported}
            onChange={(e) => set("unsupported", e.target.value as MorseCodeOptions["unsupported"])}
          >
            <option value="error">Show error</option>
            <option value="skip">Skip</option>
            <option value="question">Replace with ?</option>
          </select>
        </label>
        <label className={CLS_LABEL}>
          <input type="checkbox" checked={options.extended} onChange={(e) => set("extended", e.target.checked)} />
          Accented letters &amp; prosigns
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button size="sm" variant="secondary" onClick={playing ? stop : play} disabled={segments.length === 0}>
          {playing ? "Stop" : "Play"}
        </Button>
        <Button size="sm" variant="ghost" onClick={download} disabled={segments.length === 0}>
          Download WAV
        </Button>
        <label className={CLS_LABEL}>
          Speed
          <input
            type="number"
            min={5}
            max={60}
            className={CLS_NUM}
            value={options.wpm}
            onChange={(e) => set("wpm", Math.min(60, Math.max(5, Number(e.target.value) || 20)))}
          />
          wpm
        </label>
        <label className={CLS_LABEL} title="Farnsworth: send letters fast but space them out, for learning">
          Effective
          <input
            type="number"
            min={5}
            max={60}
            className={CLS_NUM}
            value={options.farnsworthWpm}
            onChange={(e) => set("farnsworthWpm", Math.min(60, Math.max(5, Number(e.target.value) || 20)))}
          />
          wpm
        </label>
        <label className={CLS_LABEL}>
          Tone
          <input
            type="number"
            min={200}
            max={1500}
            step={50}
            className={CLS_NUM}
            value={options.frequency}
            onChange={(e) => set("frequency", Math.min(1500, Math.max(200, Number(e.target.value) || 600)))}
          />
          Hz
        </label>
        {segments.length > 0 && <span className="text-xs text-text-muted">{seconds.toFixed(1)} s</span>}
      </div>
      <div className="min-h-0 flex-1">
        <DualPane
          input={
            <div className="flex h-full flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Input</label>
              <ToolInput
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={options.mode === "text-to-morse" ? "Type text to encode" : "... --- ... / .... . .-.. .--."}
                aria-label="Morse converter input"
              />
            </div>
          }
          output={
            <OutputPane
              onSwap={() => set("mode", options.mode === "text-to-morse" ? "morse-to-text" : "text-to-morse")}
              value={result.output}
              error={result.error?.message ?? null}
              placeholder="Converted output will appear here"
            />
          }
        />
      </div>
    </div>
  );
}
