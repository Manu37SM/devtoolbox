import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const dataStorageConverterTool: ToolRegistryEntry = {
  slug: "data-storage-converter",
  name: "Data Storage Converter",
  module: "converters",
  description: "Convert between bits, bytes, KB/MB/GB/TB (decimal) and KiB/MiB/GiB/TiB (binary) — and see why a 1 TB drive shows as 931 GiB.",
  aliases: ["bytes converter","gb to mb","kib to kb","file size converter","storage units"],
  icon: "HardDrive",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["bytes converter","gb to mb","kib to kb","file size converter","storage units"] },
};
