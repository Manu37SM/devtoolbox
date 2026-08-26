

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

interface Args {
  module: string;
  slug: string;
  name: string;
}

function parseArgs(): Args {
  const args = Object.fromEntries(
    process.argv.slice(2).map((arg) => {
      const [key, value] = arg.replace(/^--/, "").split("=");
      return [key, value ?? ""];
    }),
  );

  if (!args.module || !args.slug || !args.name) {
    throw new Error(
      "Usage: generate:tool -- --module=<module> --slug=<slug> --name=\"<Display Name>\"",
    );
  }

  return { module: args.module, slug: args.slug, name: args.name };
}

function main() {
  const { module, slug, name } = parseArgs();
  const dir = join(process.cwd(), "frontend/src/modules/tools", module, slug);

  if (existsSync(dir)) {
    throw new Error(`Tool directory already exists: ${dir}`);
  }

  mkdirSync(dir, { recursive: true });

  const pascalSlug = slug
    .split("-")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join("");

  writeFileSync(
    join(dir, "index.ts"),
    `import type { ToolRegistryEntry } from "@devtoolbox/shared";

export const ${lowerFirst(pascalSlug)}Tool: ToolRegistryEntry = {
  slug: "${slug}",
  name: "${name}",
  module: "${module}",
  description: "TODO: one sentence describing what this tool does.",
  aliases: [],
  icon: "TODO",
  isClientOnly: true,
  isWorkerEligible: false,
  seo: { keywords: [] },
};
`,
  );

  writeFileSync(
    join(dir, "schema.ts"),
    `import { z } from "zod";

export const ${lowerFirst(pascalSlug)}OptionsSchema = z.object({
  // TODO: define this tool's options
});

export type ${pascalSlug}Options = z.infer<typeof ${lowerFirst(pascalSlug)}OptionsSchema>;
`,
  );

  writeFileSync(
    join(dir, "transform.ts"),
    `// Pure function(s) only - no DOM/React. See DEVELOPMENT_GUIDE.md §5.
export function ${lowerFirst(pascalSlug)}(input: string): string {
  // TODO: implement
  return input;
}
`,
  );

  writeFileSync(
    join(dir, "transform.test.ts"),
    `import { describe, expect, it } from "vitest";
import { ${lowerFirst(pascalSlug)} } from "./transform";

describe("${lowerFirst(pascalSlug)}", () => {
  it("TODO: cover valid input, edge cases, and every option combination", () => {
    expect(${lowerFirst(pascalSlug)}("input")).toBeDefined();
  });
});
`,
  );

  writeFileSync(
    join(dir, "ToolView.tsx"),
    `// Compose ToolShell + OptionsPanel + OutputPane (see UI_GUIDELINES.md §4).
// Do not build a bespoke layout without design review sign-off.
export function ${pascalSlug}ToolView() {
  return null; // TODO
}
`,
  );

  writeFileSync(
    join(dir, "content.mdx"),
    `## How it works

TODO

## Common use cases

- TODO

## Related tools

TODO
`,
  );

  console.log(`Scaffolded ${name} at ${dir}. Register it in frontend/src/lib/registry.ts.`);
}

function lowerFirst(value: string): string {
  return value[0]?.toLowerCase() + value.slice(1);
}

main();
