import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const javaDateFormatConverterTool: ToolRegistryEntry = {
  slug: "java-date-format-converter",
  name: "Date Format Converter (Java / strftime / Moment / Oracle)",
  module: "code",
  description: "Translate date/time format patterns between Java DateTimeFormatter, C/Python/Ruby strftime, Moment.js/Day.js and Oracle TO_CHAR, with a rendered sample to check the result.",
  aliases: ["simpledateformat","datetimeformatter pattern","strftime to java","oracle to_char format","moment format converter"],
  icon: "CalendarClock",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["simpledateformat","datetimeformatter pattern","strftime to java","oracle to_char format","moment format converter"] },
};
