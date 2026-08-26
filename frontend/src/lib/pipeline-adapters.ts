

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

export interface PipelineStepOutcome {
  output: string;
  error: { message: string } | null;
}

export interface PipelineAdapter {
  run: (input: string, options: unknown) => Promise<PipelineStepOutcome>;
  getDefaultOptions: () => unknown;
}

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

const registrySlugs = new Set(toolRegistry.map((t) => t.slug));
for (const slug of Object.keys(PIPELINE_COMPATIBLE_TOOLS)) {
  if (!registrySlugs.has(slug)) {
    throw new Error(
      `pipeline-adapters.ts: "${slug}" is registered as pipeline-compatible but not found in toolRegistry. Fix the slug or remove the adapter.`,
    );
  }
}

export const pipelineCompatibleSlugs: string[] = Object.keys(PIPELINE_COMPATIBLE_TOOLS);
