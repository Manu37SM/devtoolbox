

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

import { morseCodeConverterTool } from "@/modules/tools/converters/morse-code-converter";
import { base32ConverterTool } from "@/modules/tools/encoding/base32-converter";
import { unicodeEscapeConverterTool } from "@/modules/tools/encoding/unicode-escape-converter";
import { numberToWordsConverterTool } from "@/modules/tools/converters/number-to-words-converter";
import { iso8601DurationConverterTool } from "@/modules/tools/converters/iso-8601-duration-converter";
import { pxRemConverterTool } from "@/modules/tools/converters/px-rem-converter";
import { queryStringJsonTool } from "@/modules/tools/data-format/query-string-json";
import { curlToCodeTool } from "@/modules/tools/code/curl-to-code";

import { natoAlphabetConverterTool } from "@/modules/tools/converters/nato-alphabet-converter";

import { classicalCiphersTool } from "@/modules/tools/text/classical-ciphers";

import { listConverterTool } from "@/modules/tools/text/list-converter";

import { stringEscapeTool } from "@/modules/tools/text/string-escape";

import { findReplaceTextTool } from "@/modules/tools/text/find-replace-text";

import { wordFrequencyTool } from "@/modules/tools/text/word-frequency";

import { textCleanerTool } from "@/modules/tools/text/text-cleaner";

import { emailNormalizerTool } from "@/modules/tools/text/email-normalizer";

import { propertiesYamlTool } from "@/modules/tools/data-format/properties-yaml";

import { yamlTomlTool } from "@/modules/tools/data-format/yaml-toml";

import { jsonToJavaTool } from "@/modules/tools/data-format/json-to-java";

import { jsonToSqlTool } from "@/modules/tools/data-format/json-to-sql";

import { ndjsonJsonTool } from "@/modules/tools/data-format/ndjson-json";

import { dockerRunToComposeTool } from "@/modules/tools/code/docker-run-to-compose";

import { chmodCalculatorTool } from "@/modules/tools/code/chmod-calculator";

import { gitignoreGeneratorTool } from "@/modules/tools/code/gitignore-generator";

import { semverToolTool } from "@/modules/tools/code/semver-tool";

import { keycodeInfoTool } from "@/modules/tools/code/keycode-info";

import { httpStatusCodesTool } from "@/modules/tools/network/http-status-codes";

import { mimeTypesTool } from "@/modules/tools/network/mime-types";

import { basicAuthGeneratorTool } from "@/modules/tools/network/basic-auth-generator";

import { ipv4AddressConverterTool } from "@/modules/tools/network/ipv4-address-converter";

import { ipv4RangeExpanderTool } from "@/modules/tools/network/ipv4-range-expander";

import { macAddressToolTool } from "@/modules/tools/network/mac-address-tool";

import { ipv6UlaGeneratorTool } from "@/modules/tools/network/ipv6-ula-generator";

import { ibanValidatorTool } from "@/modules/tools/converters/iban-validator";

import { jwtEncoderTool } from "@/modules/tools/security/jwt-encoder";

import { aesEncryptDecryptTool } from "@/modules/tools/security/aes-encrypt-decrypt";

import { ulidNanoidGeneratorTool } from "@/modules/tools/generators/ulid-nanoid-generator";

import { randomPortGeneratorTool } from "@/modules/tools/generators/random-port-generator";

import { luhnValidatorTool } from "@/modules/tools/security/luhn-validator";

import { colorContrastCheckerTool } from "@/modules/tools/converters/color-contrast-checker";

import { cssClampGeneratorTool } from "@/modules/tools/code/css-clamp-generator";

import { aspectRatioCalculatorTool } from "@/modules/tools/converters/aspect-ratio-calculator";

import { percentageCalculatorTool } from "@/modules/tools/converters/percentage-calculator";

import { dateCalculatorTool } from "@/modules/tools/converters/date-calculator";

import { mathEvaluatorTool } from "@/modules/tools/converters/math-evaluator";

import { downloadTimeCalculatorTool } from "@/modules/tools/converters/download-time-calculator";

import { ieee754InspectorTool } from "@/modules/tools/converters/ieee754-inspector";

import { indianNumberSystemConverterTool } from "@/modules/tools/converters/indian-number-system-converter";

import { binaryTextConverterTool } from "@/modules/tools/encoding/binary-text-converter";

import { dataStorageConverterTool } from "@/modules/tools/converters/data-storage-converter";

import { bitwiseCalculatorTool } from "@/modules/tools/converters/bitwise-calculator";

import { emiLoanCalculatorTool } from "@/modules/tools/converters/emi-loan-calculator";

import { compoundInterestCalculatorTool } from "@/modules/tools/converters/compound-interest-calculator";

import { gstCalculatorTool } from "@/modules/tools/converters/gst-calculator";

import { indianIdValidatorTool } from "@/modules/tools/converters/indian-id-validator";

import { pkceGeneratorTool } from "@/modules/tools/security/pkce-generator";

import { checksumCalculatorTool } from "@/modules/tools/encoding/checksum-calculator";

import { httpHeaderAnalyzerTool } from "@/modules/tools/network/http-header-analyzer";

import { cookieParserTool } from "@/modules/tools/network/cookie-parser";

import { portReferenceTool } from "@/modules/tools/network/port-reference";

import { javaStacktraceAnalyzerTool } from "@/modules/tools/text/java-stacktrace-analyzer";

import { readingTimeEstimatorTool } from "@/modules/tools/text/reading-time-estimator";
import { passphraseGeneratorTool } from "@/modules/tools/generators/passphrase-generator";
import { javaDateFormatConverterTool } from "@/modules/tools/code/java-date-format-converter";
import { openapiViewerTool } from "@/modules/tools/data-format/openapi-viewer";
import { idDecoderTool } from "@/modules/tools/encoding/id-decoder";
import { base58Base62ConverterTool } from "@/modules/tools/encoding/base58-base62-converter";
import { hashIdentifierTool } from "@/modules/tools/security/hash-identifier";
import { json5JsoncConverterTool } from "@/modules/tools/data-format/json5-jsonc-converter";
import { kubernetesSecretEncoderTool } from "@/modules/tools/data-format/kubernetes-secret-encoder";
import { kubernetesResourceConverterTool } from "@/modules/tools/converters/kubernetes-resource-converter";
import { numberTheoryCalculatorTool } from "@/modules/tools/converters/number-theory-calculator";
import { statisticsCalculatorTool } from "@/modules/tools/converters/statistics-calculator";
import { durationConverterTool } from "@/modules/tools/converters/duration-converter";
import { hexDumpViewerTool } from "@/modules/tools/encoding/hex-dump-viewer";
import { unicodeInspectorTool } from "@/modules/tools/text/unicode-inspector";
import { markdownTocGeneratorTool } from "@/modules/tools/text/markdown-toc-generator";
import { globPatternTesterTool } from "@/modules/tools/code/glob-pattern-tester";
import { conventionalCommitLinterTool } from "@/modules/tools/code/conventional-commit-linter";
import { utmLinkBuilderTool } from "@/modules/tools/network/utm-link-builder";
import { cacheControlBuilderTool } from "@/modules/tools/network/cache-control-builder";
import { cspBuilderTool } from "@/modules/tools/security/csp-builder";
import { icsEventGeneratorTool } from "@/modules/tools/generators/ics-event-generator";
import { licenseGeneratorTool } from "@/modules/tools/generators/license-generator";
import { robotsTxtGeneratorTool } from "@/modules/tools/network/robots-txt-generator";

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
  morseCodeConverterTool,
  base32ConverterTool,
  unicodeEscapeConverterTool,
  numberToWordsConverterTool,
  iso8601DurationConverterTool,
  pxRemConverterTool,
  queryStringJsonTool,
  curlToCodeTool,
  natoAlphabetConverterTool,
  classicalCiphersTool,
  listConverterTool,
  stringEscapeTool,
  findReplaceTextTool,
  wordFrequencyTool,
  textCleanerTool,
  emailNormalizerTool,
  propertiesYamlTool,
  yamlTomlTool,
  jsonToJavaTool,
  jsonToSqlTool,
  ndjsonJsonTool,
  dockerRunToComposeTool,
  chmodCalculatorTool,
  gitignoreGeneratorTool,
  semverToolTool,
  keycodeInfoTool,
  httpStatusCodesTool,
  mimeTypesTool,
  basicAuthGeneratorTool,
  ipv4AddressConverterTool,
  ipv4RangeExpanderTool,
  macAddressToolTool,
  ipv6UlaGeneratorTool,
  ibanValidatorTool,
  jwtEncoderTool,
  aesEncryptDecryptTool,
  ulidNanoidGeneratorTool,
  randomPortGeneratorTool,
  luhnValidatorTool,
  colorContrastCheckerTool,
  cssClampGeneratorTool,
  aspectRatioCalculatorTool,
  percentageCalculatorTool,
  dateCalculatorTool,
  mathEvaluatorTool,
  downloadTimeCalculatorTool,
  ieee754InspectorTool,
  indianNumberSystemConverterTool,
  binaryTextConverterTool,
  dataStorageConverterTool,
  bitwiseCalculatorTool,
  emiLoanCalculatorTool,
  compoundInterestCalculatorTool,
  gstCalculatorTool,
  indianIdValidatorTool,
  pkceGeneratorTool,
  checksumCalculatorTool,
  httpHeaderAnalyzerTool,
  cookieParserTool,
  portReferenceTool,
  javaStacktraceAnalyzerTool,
  readingTimeEstimatorTool,
  passphraseGeneratorTool,
  javaDateFormatConverterTool,
  openapiViewerTool,
  idDecoderTool,
  base58Base62ConverterTool,
  hashIdentifierTool,
  json5JsoncConverterTool,
  kubernetesSecretEncoderTool,
  kubernetesResourceConverterTool,
  numberTheoryCalculatorTool,
  statisticsCalculatorTool,
  durationConverterTool,
  hexDumpViewerTool,
  unicodeInspectorTool,
  markdownTocGeneratorTool,
  globPatternTesterTool,
  conventionalCommitLinterTool,
  utmLinkBuilderTool,
  cacheControlBuilderTool,
  cspBuilderTool,
  icsEventGeneratorTool,
  licenseGeneratorTool,
  robotsTxtGeneratorTool,
];

export function getToolBySlug(slug: string): ToolRegistryEntry | undefined {
  return toolRegistry.find((tool) => tool.slug === slug);
}

export function getToolsByModule(module: ToolRegistryEntry["module"]): ToolRegistryEntry[] {
  return toolRegistry.filter((tool) => tool.module === module);
}
