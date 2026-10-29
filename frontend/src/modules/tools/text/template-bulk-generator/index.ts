import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const templateBulkGeneratorTool: ToolRegistryEntry = {
  slug: "template-bulk-generator",
  name: "Template Bulk Generator (Mail Merge)",
  module: "text",
  description: "Fill a {{column}} template once per row of CSV, TSV or JSON data, with filters such as sql, json, url, shell, upper and default, to generate SQL, commands, configs or messages in bulk.",
  aliases: ["mail merge online","template from csv","generate sql from csv","bulk text generator","handlebars from spreadsheet"],
  icon: "Files",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["mail merge online","template from csv","generate sql from csv","bulk text generator","handlebars from spreadsheet"] },
};
