// Single source of truth for the tool catalog: powers the command palette,
// sitemap.xml, /tools index page, and related-tools linking. See
// DEVELOPMENT_GUIDE.md §5 — every new tool's `index.ts` gets registered here.

import type { ToolRegistryEntry } from "@devtoolbox/shared";
import { jsonFormatterTool } from "@/modules/tools/data-format/json-formatter";
import { jsonYamlTool } from "@/modules/tools/data-format/json-yaml";
import { yamlFormatterTool } from "@/modules/tools/data-format/yaml-formatter";
import { jsonXmlTool } from "@/modules/tools/data-format/json-xml";
import { jsonCsvTool } from "@/modules/tools/data-format/json-csv";
import { xmlFormatterTool } from "@/modules/tools/data-format/xml-formatter";
import { base64Tool } from "@/modules/tools/encoding/base64";
import { urlEncodeDecodeTool } from "@/modules/tools/encoding/url-encode-decode";
import { htmlEntityTool } from "@/modules/tools/encoding/html-entity";
import { jwtDecoderTool } from "@/modules/tools/encoding/jwt-decoder";
import { hashGeneratorTool } from "@/modules/tools/security/hash-generator";
import { uuidGeneratorTool } from "@/modules/tools/security/uuid-generator";
import { passwordGeneratorTool } from "@/modules/tools/security/password-generator";
import { caseConverterTool } from "@/modules/tools/text/case-converter";
import { stringCounterTool } from "@/modules/tools/text/string-counter";
import { loremIpsumTool } from "@/modules/tools/text/lorem-ipsum";
import { textDiffTool } from "@/modules/tools/text/text-diff";
import { regexTesterTool } from "@/modules/tools/text/regex-tester";
import { markdownHtmlTool } from "@/modules/tools/text/markdown-html";
import { numberBaseConverterTool } from "@/modules/tools/converters/number-base-converter";
import { unixTimestampTool } from "@/modules/tools/converters/unix-timestamp";
import { colorConverterTool } from "@/modules/tools/converters/color-converter";
import { jsTsBeautifierTool } from "@/modules/tools/code/js-ts-beautifier";
import { cssBeautifierTool } from "@/modules/tools/code/css-beautifier";
import { htmlBeautifierTool } from "@/modules/tools/code/html-beautifier";
import { cronBuilderTool } from "@/modules/tools/code/cron-builder";
import { qrCodeGeneratorTool } from "@/modules/tools/image/qr-code-generator";
import { randomGeneratorTool } from "@/modules/tools/generators/random-generator";
import { uuidBulkTool } from "@/modules/tools/generators/uuid-bulk";

export const toolRegistry: ToolRegistryEntry[] = [
  jsonFormatterTool,
  jsonYamlTool,
  yamlFormatterTool,
  jsonXmlTool,
  jsonCsvTool,
  xmlFormatterTool,
  base64Tool,
  urlEncodeDecodeTool,
  htmlEntityTool,
  jwtDecoderTool,
  hashGeneratorTool,
  uuidGeneratorTool,
  passwordGeneratorTool,
  caseConverterTool,
  stringCounterTool,
  loremIpsumTool,
  textDiffTool,
  regexTesterTool,
  markdownHtmlTool,
  numberBaseConverterTool,
  unixTimestampTool,
  colorConverterTool,
  jsTsBeautifierTool,
  cssBeautifierTool,
  htmlBeautifierTool,
  cronBuilderTool,
  qrCodeGeneratorTool,
  randomGeneratorTool,
  uuidBulkTool,
];

export function getToolBySlug(slug: string): ToolRegistryEntry | undefined {
  return toolRegistry.find((tool) => tool.slug === slug);
}

export function getToolsByModule(module: ToolRegistryEntry["module"]): ToolRegistryEntry[] {
  return toolRegistry.filter((tool) => tool.module === module);
}
