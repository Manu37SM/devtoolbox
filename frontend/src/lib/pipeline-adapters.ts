// Pipelines (Phase 2, P1 — FEATURE.md "Pipelines (chain tools, client-only)").
//
// A pipeline chains tools by feeding one tool's text output into the next
// tool's text input. That only works for tools whose `transform.ts` matches
// the standard `(input: string, options) => { output: string, error }`
// contract (or an async version of it) — see `TransformResult` in
// `frontend/src/lib/tool-transform.ts`. Not every tool matches: several
// take a second required input (a diff's "before"/"after", HMAC's secret
// key, regex's pattern), and a few return structured/non-string results for
// dedicated UIs. This module hand-picks the subset that's genuinely
// single-string-input/single-string-output and wraps each in a uniform
// async `run()` so the pipeline runner doesn't need to know about any
// individual tool's shape.
//
// ── Included (single input -> single output, TransformResult-shaped) ──────
// json-formatter, json-yaml, json-xml, json-csv, xml-formatter,
// yaml-formatter, json-toml, csv-tsv, base64, url-encode-decode,
// html-entity, hex-text, gzip-deflate (async), hash-generator (async;
// produces exactly one hash string per its `algorithm` option, not multiple
// at once, so it fits), slugify, line-sort-dedupe, sql-formatter,
// dotenv-formatter (extra `warnings` field ignored, `output`/`error` still
// present), js-ts-beautifier (async), css-beautifier (async),
// html-beautifier (async), text-table, html-jsx.
//
// ── Excluded, and why ───────────────────────────────────────────────────
// - text-diff, json-diff, code-diff: need two independent inputs
//   (before/after), not a single piped string.
// - hmac-generator: needs a secret key in addition to the piped text —
//   not a pure single-input transform.
// - regex-tester: needs a separate regex pattern input; its
//   `testRegex`/`replaceRegex` don't take `(input, options)` alone.
// - regex-cheatsheet: not a text transform at all (filters a static list
//   of pattern reference entries).
// - case-converter, string-counter, markdown-html: their transform
//   functions return a bare `string`/stats object, not the
//   `{ output, error }` shape (`convertCase` -> string, `analyzeText` ->
//   `StringStats`, `markdownToHtml` -> string) — could be wrapped, but per
//   the "only tools that genuinely match the standard shape" rule for v1
//   we leave them out rather than special-case non-conforming exports.
// - color-converter, number-base-converter: return structured
//   multi-representation objects (`ColorFormats`, `NumberBaseResult`), not
//   a single string output.
// - password-strength-analyzer, unit-converter, timezone-converter,
//   cidr-subnet-calculator, user-agent-parser, color-palette-generator:
//   documented in this task's brief as structured-output tools built for
//   dedicated result UIs, not string-to-string transforms.

import { toolRegistry } from "@/lib/registry";

import { formatJson } from "@/modules/tools/data-format/json-formatter/transform";
import { jsonFormatterOptionsSchema } from "@/modules/tools/data-format/json-formatter/schema";
import { convertJsonYaml } from "@/modules/tools/data-format/json-yaml/transform";
import { jsonYamlOptionsSchema } from "@/modules/tools/data-format/json-yaml/schema";
import { convertJsonXml } from "@/modules/tools/data-format/json-xml/transform";
import { jsonXmlOptionsSchema } from "@/modules/tools/data-format/json-xml/schema";
import { convertJsonCsv } from "@/modules/tools/data-format/json-csv/transform";
import { jsonCsvOptionsSchema } from "@/modules/tools/data-format/json-csv/schema";
import { formatXml } from "@/modules/tools/data-format/xml-formatter/transform";
import { xmlFormatterOptionsSchema } from "@/modules/tools/data-format/xml-formatter/schema";
import { formatYaml } from "@/modules/tools/data-format/yaml-formatter/transform";
import { yamlFormatterOptionsSchema } from "@/modules/tools/data-format/yaml-formatter/schema";
import { convertJsonToml } from "@/modules/tools/data-format/json-toml/transform";
import { jsonTomlOptionsSchema } from "@/modules/tools/data-format/json-toml/schema";
import { convertCsvTsv } from "@/modules/tools/data-format/csv-tsv/transform";
import { csvTsvOptionsSchema } from "@/modules/tools/data-format/csv-tsv/schema";
import { formatSql } from "@/modules/tools/data-format/sql-formatter/transform";
import { sqlFormatterOptionsSchema } from "@/modules/tools/data-format/sql-formatter/schema";

import { transformBase64 } from "@/modules/tools/encoding/base64/transform";
import { base64OptionsSchema } from "@/modules/tools/encoding/base64/schema";
import { transformUrlEncode } from "@/modules/tools/encoding/url-encode-decode/transform";
import { urlEncodeOptionsSchema } from "@/modules/tools/encoding/url-encode-decode/schema";
import { transformHtmlEntity } from "@/modules/tools/encoding/html-entity/transform";
import { htmlEntityOptionsSchema } from "@/modules/tools/encoding/html-entity/schema";
import { transformHexText } from "@/modules/tools/encoding/hex-text/transform";
import { hexTextOptionsSchema } from "@/modules/tools/encoding/hex-text/schema";
import { compressText } from "@/modules/tools/encoding/gzip-deflate/transform";
import { gzipDeflateOptionsSchema } from "@/modules/tools/encoding/gzip-deflate/schema";

import { hashText } from "@/modules/tools/security/hash-generator/transform";
import { hashGeneratorOptionsSchema } from "@/modules/tools/security/hash-generator/schema";

import { slugify } from "@/modules/tools/text/slugify/transform";
import { slugifyOptionsSchema } from "@/modules/tools/text/slugify/schema";
import { sortDedupeLines } from "@/modules/tools/text/line-sort-dedupe/transform";
import { lineSortDedupeOptionsSchema } from "@/modules/tools/text/line-sort-dedupe/schema";
import { convertTable } from "@/modules/tools/text/text-table/transform";
import { textTableOptionsSchema } from "@/modules/tools/text/text-table/schema";

import { beautifyJsTs } from "@/modules/tools/code/js-ts-beautifier/transform";
import { jsTsBeautifierOptionsSchema } from "@/modules/tools/code/js-ts-beautifier/schema";
import { beautifyCss } from "@/modules/tools/code/css-beautifier/transform";
import { cssBeautifierOptionsSchema } from "@/modules/tools/code/css-beautifier/schema";
import { beautifyHtml } from "@/modules/tools/code/html-beautifier/transform";
import { htmlBeautifierOptionsSchema } from "@/modules/tools/code/html-beautifier/schema";
import { formatDotenv } from "@/modules/tools/code/dotenv-formatter/transform";
import { dotenvFormatterOptionsSchema } from "@/modules/tools/code/dotenv-formatter/schema";
import { htmlToJsx } from "@/modules/tools/code/html-jsx/transform";
import { htmlJsxOptionsSchema } from "@/modules/tools/code/html-jsx/schema";

/** Uniform per-step result shape every adapter's `run()` resolves to. */
export interface PipelineStepOutcome {
  output: string;
  error: { message: string } | null;
}

export interface PipelineAdapter {
  run: (input: string, options: unknown) => Promise<PipelineStepOutcome>;
  getDefaultOptions: () => unknown;
}

/** Normalizes a (possibly richer) transform result down to the outcome
 * shape pipelines care about — drops extra fields like dotenv's
 * `warnings` or a result's `line`/`column` error detail. */
function toOutcome(result: { output: string; error: { message: string } | null }): PipelineStepOutcome {
  return { output: result.output, error: result.error ? { message: result.error.message } : null };
}

export const PIPELINE_COMPATIBLE_TOOLS: Record<string, PipelineAdapter> = {
  "json-formatter": {
    run: (input, options) => Promise.resolve(toOutcome(formatJson(input, options as never))),
    getDefaultOptions: () => jsonFormatterOptionsSchema.parse({}),
  },
  "json-yaml": {
    run: (input, options) => Promise.resolve(toOutcome(convertJsonYaml(input, options as never))),
    getDefaultOptions: () => jsonYamlOptionsSchema.parse({}),
  },
  "json-xml": {
    run: (input, options) => Promise.resolve(toOutcome(convertJsonXml(input, options as never))),
    getDefaultOptions: () => jsonXmlOptionsSchema.parse({}),
  },
  "json-csv": {
    run: (input, options) => Promise.resolve(toOutcome(convertJsonCsv(input, options as never))),
    getDefaultOptions: () => jsonCsvOptionsSchema.parse({}),
  },
  "xml-formatter": {
    run: (input, options) => Promise.resolve(toOutcome(formatXml(input, options as never))),
    getDefaultOptions: () => xmlFormatterOptionsSchema.parse({}),
  },
  "yaml-formatter": {
    run: (input, options) => Promise.resolve(toOutcome(formatYaml(input, options as never))),
    getDefaultOptions: () => yamlFormatterOptionsSchema.parse({}),
  },
  "json-toml": {
    run: (input, options) => Promise.resolve(toOutcome(convertJsonToml(input, options as never))),
    getDefaultOptions: () => jsonTomlOptionsSchema.parse({}),
  },
  "csv-tsv": {
    run: (input, options) => Promise.resolve(toOutcome(convertCsvTsv(input, options as never))),
    getDefaultOptions: () => csvTsvOptionsSchema.parse({}),
  },
  "sql-formatter": {
    run: (input, options) => Promise.resolve(toOutcome(formatSql(input, options as never))),
    getDefaultOptions: () => sqlFormatterOptionsSchema.parse({}),
  },
  base64: {
    run: (input, options) => Promise.resolve(toOutcome(transformBase64(input, options as never))),
    getDefaultOptions: () => base64OptionsSchema.parse({}),
  },
  "url-encode-decode": {
    run: (input, options) => Promise.resolve(toOutcome(transformUrlEncode(input, options as never))),
    getDefaultOptions: () => urlEncodeOptionsSchema.parse({}),
  },
  "html-entity": {
    run: (input, options) => Promise.resolve(toOutcome(transformHtmlEntity(input, options as never))),
    getDefaultOptions: () => htmlEntityOptionsSchema.parse({}),
  },
  "hex-text": {
    run: (input, options) => Promise.resolve(toOutcome(transformHexText(input, options as never))),
    getDefaultOptions: () => hexTextOptionsSchema.parse({}),
  },
  "gzip-deflate": {
    run: async (input, options) => toOutcome(await compressText(input, options as never)),
    getDefaultOptions: () => gzipDeflateOptionsSchema.parse({}),
  },
  "hash-generator": {
    run: async (input, options) => toOutcome(await hashText(input, options as never)),
    getDefaultOptions: () => hashGeneratorOptionsSchema.parse({}),
  },
  slugify: {
    run: (input, options) => Promise.resolve(toOutcome(slugify(input, options as never))),
    getDefaultOptions: () => slugifyOptionsSchema.parse({}),
  },
  "line-sort-dedupe": {
    run: (input, options) => Promise.resolve(toOutcome(sortDedupeLines(input, options as never))),
    getDefaultOptions: () => lineSortDedupeOptionsSchema.parse({}),
  },
  "text-table": {
    run: (input, options) => Promise.resolve(toOutcome(convertTable(input, options as never))),
    getDefaultOptions: () => textTableOptionsSchema.parse({}),
  },
  "js-ts-beautifier": {
    run: async (input, options) => toOutcome(await beautifyJsTs(input, options as never)),
    getDefaultOptions: () => jsTsBeautifierOptionsSchema.parse({}),
  },
  "css-beautifier": {
    run: async (input, options) => toOutcome(await beautifyCss(input, options as never)),
    getDefaultOptions: () => cssBeautifierOptionsSchema.parse({}),
  },
  "html-beautifier": {
    run: async (input, options) => toOutcome(await beautifyHtml(input, options as never)),
    getDefaultOptions: () => htmlBeautifierOptionsSchema.parse({}),
  },
  "dotenv-formatter": {
    run: (input, options) => Promise.resolve(toOutcome(formatDotenv(input, options as never))),
    getDefaultOptions: () => dotenvFormatterOptionsSchema.parse({}),
  },
  "html-jsx": {
    run: (input, options) => Promise.resolve(toOutcome(htmlToJsx(input, options as never))),
    getDefaultOptions: () => htmlJsxOptionsSchema.parse({}),
  },
};

// Cross-check every adapter slug actually exists in the tool registry —
// a typo here would otherwise silently create a dead pipeline step (a
// select option with no matching tool name/route). Fail loudly at module
// load instead.
const registrySlugs = new Set(toolRegistry.map((t) => t.slug));
for (const slug of Object.keys(PIPELINE_COMPATIBLE_TOOLS)) {
  if (!registrySlugs.has(slug)) {
    throw new Error(
      `pipeline-adapters.ts: "${slug}" is registered as pipeline-compatible but not found in toolRegistry. Fix the slug or remove the adapter.`,
    );
  }
}

export const pipelineCompatibleSlugs: string[] = Object.keys(PIPELINE_COMPATIBLE_TOOLS);
