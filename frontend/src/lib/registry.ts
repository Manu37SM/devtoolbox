

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

import { jsonTomlTool } from "@/modules/tools/data-format/json-toml";
import { jsonPathTesterTool } from "@/modules/tools/data-format/json-path-tester";
import { jsonDiffTool } from "@/modules/tools/data-format/json-diff";
import { jsonSchemaGeneratorTool } from "@/modules/tools/data-format/json-schema-generator";
import { jsonToTypesTool } from "@/modules/tools/data-format/json-to-types";
import { sqlFormatterTool } from "@/modules/tools/data-format/sql-formatter";
import { csvTsvTool } from "@/modules/tools/data-format/csv-tsv";
import { hexTextTool } from "@/modules/tools/encoding/hex-text";
import { gzipDeflateTool } from "@/modules/tools/encoding/gzip-deflate";
import { passwordStrengthAnalyzerTool } from "@/modules/tools/security/password-strength-analyzer";
import { hmacGeneratorTool } from "@/modules/tools/security/hmac-generator";
import { lineSortDedupeTool } from "@/modules/tools/text/line-sort-dedupe";
import { slugifyTool } from "@/modules/tools/text/slugify";
import { textTableTool } from "@/modules/tools/text/text-table";
import { regexCheatsheetTool } from "@/modules/tools/text/regex-cheatsheet";
import { codeDiffTool } from "@/modules/tools/code/code-diff";
import { htmlJsxTool } from "@/modules/tools/code/html-jsx";
import { dotenvFormatterTool } from "@/modules/tools/code/dotenv-formatter";
import { timezoneConverterTool } from "@/modules/tools/converters/timezone-converter";
import { unitConverterTool } from "@/modules/tools/converters/unit-converter";
import { colorPaletteGeneratorTool } from "@/modules/tools/converters/color-palette-generator";
import { userAgentParserTool } from "@/modules/tools/network/user-agent-parser";
import { cidrSubnetCalculatorTool } from "@/modules/tools/network/cidr-subnet-calculator";
import { fakeDataGeneratorTool } from "@/modules/tools/generators/fake-data-generator";
import { urlParserTool } from "@/modules/tools/network/url-parser";
import { romanNumeralConverterTool } from "@/modules/tools/converters/roman-numeral-converter";
import { boxShadowBorderRadiusGeneratorTool } from "@/modules/tools/converters/box-shadow-border-radius-generator";
import { punycodeIdnConverterTool } from "@/modules/tools/encoding/punycode-idn-converter";
import { certificateDecoderTool } from "@/modules/tools/encoding/certificate-decoder";
import { rsaEcKeyPairGeneratorTool } from "@/modules/tools/security/rsa-ec-key-pair-generator";
import { totpGeneratorTool } from "@/modules/tools/security/totp-generator";
import { bcryptArgon2HashVerifyTool } from "@/modules/tools/security/bcrypt-argon2-hash-verify";
import { cssTailwindHelperTool } from "@/modules/tools/code/css-tailwind-helper";
import { placeholderImageGeneratorTool } from "@/modules/tools/image/placeholder-image-generator";
import { colorBlindnessSimulatorTool } from "@/modules/tools/image/color-blindness-simulator";
import { placeholderTextGeneratorTool } from "@/modules/tools/generators/placeholder-text-generator";
import { mockApiResponseGeneratorTool } from "@/modules/tools/generators/mock-api-response-generator";

import { imageCompressorTool } from "@/modules/tools/image/image-compressor";
import { imageFormatConverterTool } from "@/modules/tools/image/image-format-converter";
import { svgExporterTool } from "@/modules/tools/image/svg-exporter";
import { svgOptimizerTool } from "@/modules/tools/image/svg-optimizer";
import { qrCodeReaderTool } from "@/modules/tools/image/qr-code-reader";
import { faviconGeneratorTool } from "@/modules/tools/image/favicon-generator";
import { cssGradientGeneratorTool } from "@/modules/tools/converters/css-gradient-generator";

import { httpRequestTesterTool } from "@/modules/tools/network/http-request-tester";
import { dnsLookupTool } from "@/modules/tools/network/dns-lookup";
import { ipLookupTool } from "@/modules/tools/network/ip-lookup";
import { webhookTesterTool } from "@/modules/tools/network/webhook-tester";
import { metaTagPreviewerTool } from "@/modules/tools/network/meta-tag-previewer";

import { explainThisTool } from "@/modules/tools/ai/explain-this";
import { nlToCronTool } from "@/modules/tools/ai/nl-to-cron";
import { nlToRegexTool } from "@/modules/tools/ai/nl-to-regex";
import { aiJsonRepairTool } from "@/modules/tools/ai/ai-json-repair";
import { aiDiffSummaryTool } from "@/modules/tools/ai/ai-diff-summary";
import { generateFromExampleTool } from "@/modules/tools/ai/generate-from-example";
import { aiCommitMessageTool } from "@/modules/tools/ai/ai-commit-message";
import { codeCommenterTool } from "@/modules/tools/ai/code-commenter";
import { apiResponseToClientCodeTool } from "@/modules/tools/ai/api-response-to-client-code";

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

  jsonTomlTool,
  jsonPathTesterTool,
  jsonDiffTool,
  jsonSchemaGeneratorTool,
  jsonToTypesTool,
  sqlFormatterTool,
  csvTsvTool,
  hexTextTool,
  gzipDeflateTool,
  passwordStrengthAnalyzerTool,
  hmacGeneratorTool,
  lineSortDedupeTool,
  slugifyTool,
  textTableTool,
  regexCheatsheetTool,
  codeDiffTool,
  htmlJsxTool,
  dotenvFormatterTool,
  timezoneConverterTool,
  unitConverterTool,
  colorPaletteGeneratorTool,
  userAgentParserTool,
  cidrSubnetCalculatorTool,
  fakeDataGeneratorTool,
  urlParserTool,
  romanNumeralConverterTool,
  boxShadowBorderRadiusGeneratorTool,
  punycodeIdnConverterTool,
  certificateDecoderTool,
  rsaEcKeyPairGeneratorTool,
  totpGeneratorTool,
  bcryptArgon2HashVerifyTool,
  cssTailwindHelperTool,
  placeholderImageGeneratorTool,
  colorBlindnessSimulatorTool,
  placeholderTextGeneratorTool,
  mockApiResponseGeneratorTool,
  imageCompressorTool,
  imageFormatConverterTool,
  svgExporterTool,
  svgOptimizerTool,
  qrCodeReaderTool,
  faviconGeneratorTool,
  cssGradientGeneratorTool,
  httpRequestTesterTool,
  dnsLookupTool,
  ipLookupTool,
  webhookTesterTool,
  metaTagPreviewerTool,
  explainThisTool,
  nlToCronTool,
  nlToRegexTool,
  aiJsonRepairTool,
  aiDiffSummaryTool,
  generateFromExampleTool,
  aiCommitMessageTool,
  codeCommenterTool,
  apiResponseToClientCodeTool,
];

export function getToolBySlug(slug: string): ToolRegistryEntry | undefined {
  return toolRegistry.find((tool) => tool.slug === slug);
}

export function getToolsByModule(module: ToolRegistryEntry["module"]): ToolRegistryEntry[] {
  return toolRegistry.filter((tool) => tool.module === module);
}
