import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const iniJsonConverterTool: ToolRegistryEntry = {
  slug: "ini-json-converter",
  name: "INI ⇄ JSON Converter",
  module: "data-format",
  description: "Convert INI and .conf files to JSON and back: sections, comments, repeated keys as arrays, quoted values and optional number and boolean detection.",
  aliases: ["ini to json","json to ini","php.ini parser","config file converter","gitconfig to json"],
  icon: "ArrowRightLeft",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["ini to json","json to ini","php.ini parser","config file converter","gitconfig to json"] },
};
