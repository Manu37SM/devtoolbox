import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const geohashPlusCodeConverterTool: ToolRegistryEntry = {
  slug: "geohash-plus-code-converter",
  name: "Geohash & Plus Code Converter",
  module: "converters",
  description: "Convert latitude and longitude to Geohash and Open Location Code (Plus Code) and back, with precision control, bounding boxes and neighbouring cells.",
  aliases: ["geohash", "plus code", "open location code", "olc", "lat lng to geohash", "geohash neighbors"],
  icon: "MapPin",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["geohash & plus code converter", "geohash", "plus code", "open location code", "olc", "lat lng to geohash", "geohash neighbors"] },
};
