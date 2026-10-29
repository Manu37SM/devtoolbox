import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const databaseErrorLookupTool: ToolRegistryEntry = {
  slug: "database-error-lookup",
  name: "Database Error Code Lookup",
  module: "code",
  description: "Look up Oracle ORA- codes, PostgreSQL SQLSTATEs and MySQL error numbers from a stack trace or message, with the likely cause, the fix and the Spring exception it maps to.",
  aliases: ["ora-00942","sqlstate 23505","mysql error 1062","oracle error code meaning","postgres error codes"],
  icon: "DatabaseZap",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["ora-00942","sqlstate 23505","mysql error 1062","oracle error code meaning","postgres error codes"] },
};
