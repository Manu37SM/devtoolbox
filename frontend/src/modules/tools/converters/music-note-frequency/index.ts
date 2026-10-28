import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const musicNoteFrequencyTool: ToolRegistryEntry = {
  slug: "music-note-frequency",
  name: "Music Note ⇄ Frequency Converter",
  module: "converters",
  description: "Convert between note names (A4, C#3), MIDI numbers and frequencies in Hz with cents offset, a custom A4 reference pitch (432, 442...) and the wavelength in air.",
  aliases: ["note to hz","midi note number","a440 frequency","pitch calculator","cents off pitch"],
  icon: "Music",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["note to hz","midi note number","a440 frequency","pitch calculator","cents off pitch"] },
};
