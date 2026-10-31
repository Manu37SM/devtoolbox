import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const julianDateConverterTool: ToolRegistryEntry = {
  slug: "julian-date-converter",
  name: "Julian Date & Calendar Converter",
  module: "converters",
  description: "Convert between Gregorian and Julian calendar dates and mainframe Julian formats YYDDD, CYYDDD and YYYYDDD, JD, MJD, Lilian, Rata Die and Excel serials, with weekday, century pivot and batch lines.",
  aliases: ["julian date", "cyyddd", "yyddd", "julian day number", "jd edwards julian", "julian calendar", "old style new style", "mjd", "lilian date", "rata die", "ordinal date"],
  icon: "CalendarDays",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["julian date & calendar converter", "julian date", "cyyddd", "yyddd", "julian day number", "jd edwards julian", "julian calendar", "old style new style", "mjd", "lilian date", "rata die", "ordinal date"] },
};
