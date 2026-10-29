import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const sqlInClauseBuilderTool: ToolRegistryEntry = {
  slug: "sql-in-clause-builder",
  name: "SQL IN Clause Builder",
  module: "code",
  description: "Turn a pasted list of IDs or codes into a safe SQL IN list, chunked to Oracle's 1000-item limit (ORA-01795), or into VALUES rows, UNION ALL selects or INSERTs for a temp table.",
  aliases: ["ora-01795 workaround","list to sql in","comma separated to in clause","excel column to sql","sql where in generator"],
  icon: "ListFilter",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: ["ora-01795 workaround","list to sql in","comma separated to in clause","excel column to sql","sql where in generator"] },
};
