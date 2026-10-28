import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const coordinateConverterTool: ToolRegistryEntry = {
  slug: "coordinate-converter",
  name: "Coordinate Converter (DD / DMS / UTM / Geohash)",
  module: "converters",
  description: "Convert latitude and longitude between decimal degrees, degrees-minutes-seconds and degrees-decimal-minutes, and get the UTM reference and geohash. Accepts messy input.",
  aliases: ["lat long converter","dms to decimal","decimal to dms","utm converter","geohash encoder"],
  icon: "MapPin",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["lat long converter","dms to decimal","decimal to dms","utm converter","geohash encoder"] },
};
