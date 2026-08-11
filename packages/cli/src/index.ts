#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { PublicHashAlgorithms } from "@devtoolbox/shared";
import { CliError, DevToolboxClient } from "./client";

const HELP = `devtoolbox — CLI for the DevToolbox Public API (PRO/TEAM plans, api.devtoolbox.dev/v1)

Usage:
  devtoolbox hash <algorithm> <input>       algorithm: ${PublicHashAlgorithms.join("|")}
  devtoolbox json-validate <file|->         "-" reads from stdin

Environment:
  DEVTOOLBOX_API_KEY   required — create one at devtoolbox.dev/account
  DEVTOOLBOX_API_URL   optional — defaults to https://api.devtoolbox.dev/v1

Exit codes: 0 on success (or valid JSON), 1 on error (or invalid JSON) — safe to use in CI gates.
`;

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

export async function main(argv: string[]): Promise<number> {
  const [command, ...args] = argv;

  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(HELP);
    return command ? 0 : 1;
  }

  if (command === "hash") {
    const [algorithm, input] = args;
    if (!algorithm || input === undefined) {
      process.stderr.write("Usage: devtoolbox hash <algorithm> <input>\n");
      return 1;
    }
    if (!(PublicHashAlgorithms as readonly string[]).includes(algorithm)) {
      process.stderr.write(`Unknown algorithm "${algorithm}" — expected one of: ${PublicHashAlgorithms.join(", ")}\n`);
      return 1;
    }
    const client = new DevToolboxClient();
    const result = await client.hash(input, algorithm);
    process.stdout.write(`${result.digest}\n`);
    return 0;
  }

  if (command === "json-validate") {
    const [source] = args;
    if (!source) {
      process.stderr.write("Usage: devtoolbox json-validate <file|->\n");
      return 1;
    }
    const input = source === "-" ? await readStdin() : readFileSync(source, "utf8");
    const client = new DevToolboxClient();
    const result = await client.jsonValidate(input);
    process.stdout.write(`${JSON.stringify(result)}\n`);
    return result.valid ? 0 : 1;
  }

  process.stderr.write(`Unknown command "${command}".\n\n${HELP}`);
  return 1;
}

// Only run when invoked directly (the `devtoolbox` bin) — not when
// `main`/other exports are imported by tests.
if (require.main === module) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((err) => {
      process.stderr.write(`${err instanceof CliError ? err.message : String(err)}\n`);
      process.exitCode = 1;
    });
}
