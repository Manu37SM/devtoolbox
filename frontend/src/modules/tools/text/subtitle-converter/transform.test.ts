import { describe, expect, it } from "vitest";
import { formatTime, parseSubtitles, runSubtitleConverter } from "./transform";

const SRT = "1\n00:00:01,000 --> 00:00:02,500\nHello\n\n2\n00:01:00,250 --> 00:01:03,000\nSecond line\nwraps\n";
const VTT = "WEBVTT\n\n00:00:01.000 --> 00:00:02.500\nHello\n\n00:01:00.250 --> 00:01:03.000\nSecond line\nwraps\n";

describe("subtitle converter", () => {
  it("srt -> vtt", () => {
    expect(runSubtitleConverter(SRT, { target: "vtt", shiftMs: 0 }).output).toBe(VTT);
  });
  it("vtt -> srt renumbers", () => {
    expect(runSubtitleConverter(VTT, { target: "srt", shiftMs: 0 }).output).toBe(SRT);
  });
  it("shifts timestamps and clamps at zero", () => {
    expect(runSubtitleConverter(SRT, { target: "srt", shiftMs: 1500 }).output).toContain("00:00:02,500 --> 00:00:04,000");
    expect(runSubtitleConverter(SRT, { target: "srt", shiftMs: -2000 }).output).toContain("00:00:00,000 --> 00:00:00,500");
  });
  it("handles vtt with cue ids, short timestamps, notes and settings", () => {
    const v = "WEBVTT - title\n\nNOTE a comment\n\nintro\n00:01.5 --> 00:03.000 align:start\n<v Bob>Hi</v>\n";
    const cues = parseSubtitles(v);
    expect(cues).toEqual([{ start: 1500, end: 3000, text: "<v Bob>Hi</v>", settings: "align:start" }]);
    expect(runSubtitleConverter(v, { target: "srt", shiftMs: 0 }).output).toBe("1\n00:00:01,500 --> 00:00:03,000\nHi\n");
  });
  it("accepts CRLF and BOM", () => {
    expect(runSubtitleConverter("﻿" + SRT.replace(/\n/g, "\r\n"), { target: "vtt", shiftMs: 0 }).output).toBe(VTT);
  });
  it("errors with line numbers", () => {
    expect(runSubtitleConverter("1\nnot a time\ntext", { target: "vtt", shiftMs: 0 }).error?.line).toBe(1);
    expect(runSubtitleConverter("00:00:05,000 --> 00:00:01,000\nx", { target: "vtt", shiftMs: 0 }).error?.message).toMatch(/before start/);
  });
  it("formatTime", () => { expect(formatTime(3723004, ",")).toBe("01:02:03,004"); });
});
