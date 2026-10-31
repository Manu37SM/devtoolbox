import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const smpteTimecodeConverterTool: ToolRegistryEntry = {
  slug: "smpte-timecode-converter",
  name: "SMPTE Timecode Converter",
  module: "converters",
  description: "Convert SMPTE timecode, frame counts, seconds and clock time at 23.976 to 60 fps with drop-frame support, add or subtract timecodes, retime between frame rates and get film feet+frames.",
  aliases: ["smpte timecode", "drop frame timecode", "29.97 drop frame", "timecode to frames", "frames to timecode", "edl timecode", "timecode calculator", "feet and frames"],
  icon: "Film",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["smpte timecode converter", "smpte timecode", "drop frame timecode", "29.97 drop frame", "timecode to frames", "frames to timecode", "edl timecode", "timecode calculator", "feet and frames"] },
};
