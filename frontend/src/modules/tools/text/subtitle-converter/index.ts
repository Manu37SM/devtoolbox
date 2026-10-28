import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const subtitleConverterTool: ToolRegistryEntry = {
  slug: "subtitle-converter",
  name: "Subtitle Converter (SRT / WebVTT)",
  module: "text",
  description: "Convert subtitles between SRT and WebVTT, renumber cues, keep cue settings and shift every timestamp forward or backward in milliseconds to fix sync.",
  aliases: ["srt to vtt","vtt to srt","shift subtitle timing","subtitle sync offset","webvtt converter"],
  icon: "Captions",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["srt to vtt","vtt to srt","shift subtitle timing","subtitle sync offset","webvtt converter"] },
};
