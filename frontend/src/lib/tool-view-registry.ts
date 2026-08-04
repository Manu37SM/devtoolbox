// Maps tool slug -> its ToolView component. Kept separate from
// registry.ts (which only carries serializable metadata used by
// server-rendered pages/sitemap/command palette) so registry.ts stays
// safe to import from server components and route handlers.

import type { ComponentType } from "react";
import { JsonFormatterToolView } from "@/modules/tools/data-format/json-formatter/ToolView";
import { JsonYamlToolView } from "@/modules/tools/data-format/json-yaml/ToolView";
import { YamlFormatterToolView } from "@/modules/tools/data-format/yaml-formatter/ToolView";
import { JsonXmlToolView } from "@/modules/tools/data-format/json-xml/ToolView";
import { JsonCsvToolView } from "@/modules/tools/data-format/json-csv/ToolView";
import { XmlFormatterToolView } from "@/modules/tools/data-format/xml-formatter/ToolView";
import { Base64ToolView } from "@/modules/tools/encoding/base64/ToolView";
import { UrlEncodeToolView } from "@/modules/tools/encoding/url-encode-decode/ToolView";
import { HtmlEntityToolView } from "@/modules/tools/encoding/html-entity/ToolView";
import { JwtDecoderToolView } from "@/modules/tools/encoding/jwt-decoder/ToolView";
import { HashGeneratorToolView } from "@/modules/tools/security/hash-generator/ToolView";
import { UuidGeneratorToolView } from "@/modules/tools/security/uuid-generator/ToolView";
import { PasswordGeneratorToolView } from "@/modules/tools/security/password-generator/ToolView";
import { CaseConverterToolView } from "@/modules/tools/text/case-converter/ToolView";
import { StringCounterToolView } from "@/modules/tools/text/string-counter/ToolView";
import { LoremIpsumToolView } from "@/modules/tools/text/lorem-ipsum/ToolView";
import { TextDiffToolView } from "@/modules/tools/text/text-diff/ToolView";
import { RegexTesterToolView } from "@/modules/tools/text/regex-tester/ToolView";
import { MarkdownHtmlToolView } from "@/modules/tools/text/markdown-html/ToolView";
import { NumberBaseConverterToolView } from "@/modules/tools/converters/number-base-converter/ToolView";
import { UnixTimestampToolView } from "@/modules/tools/converters/unix-timestamp/ToolView";
import { ColorConverterToolView } from "@/modules/tools/converters/color-converter/ToolView";
import { JsTsBeautifierToolView } from "@/modules/tools/code/js-ts-beautifier/ToolView";
import { CssBeautifierToolView } from "@/modules/tools/code/css-beautifier/ToolView";
import { HtmlBeautifierToolView } from "@/modules/tools/code/html-beautifier/ToolView";
import { CronBuilderToolView } from "@/modules/tools/code/cron-builder/ToolView";
import { QrCodeGeneratorToolView } from "@/modules/tools/image/qr-code-generator/ToolView";
import { RandomGeneratorToolView } from "@/modules/tools/generators/random-generator/ToolView";
import { UuidBulkToolView } from "@/modules/tools/generators/uuid-bulk/ToolView";
// Phase 2 (P1) tools
import { JsonTomlToolView } from "@/modules/tools/data-format/json-toml/ToolView";
import { JsonPathTesterToolView } from "@/modules/tools/data-format/json-path-tester/ToolView";
import { JsonDiffToolView } from "@/modules/tools/data-format/json-diff/ToolView";
import { JsonSchemaGeneratorToolView } from "@/modules/tools/data-format/json-schema-generator/ToolView";
import { JsonToTypesToolView } from "@/modules/tools/data-format/json-to-types/ToolView";
import { SqlFormatterToolView } from "@/modules/tools/data-format/sql-formatter/ToolView";
import { CsvTsvToolView } from "@/modules/tools/data-format/csv-tsv/ToolView";
import { HexTextToolView } from "@/modules/tools/encoding/hex-text/ToolView";
import { GzipDeflateToolView } from "@/modules/tools/encoding/gzip-deflate/ToolView";
import { PasswordStrengthAnalyzerToolView } from "@/modules/tools/security/password-strength-analyzer/ToolView";
import { HmacGeneratorToolView } from "@/modules/tools/security/hmac-generator/ToolView";
import { LineSortDedupeToolView } from "@/modules/tools/text/line-sort-dedupe/ToolView";
import { SlugifyToolView } from "@/modules/tools/text/slugify/ToolView";
import { TextTableToolView } from "@/modules/tools/text/text-table/ToolView";
import { RegexCheatsheetToolView } from "@/modules/tools/text/regex-cheatsheet/ToolView";
import { CodeDiffToolView } from "@/modules/tools/code/code-diff/ToolView";
import { HtmlJsxToolView } from "@/modules/tools/code/html-jsx/ToolView";
import { DotenvFormatterToolView } from "@/modules/tools/code/dotenv-formatter/ToolView";
import { TimezoneConverterToolView } from "@/modules/tools/converters/timezone-converter/ToolView";
import { UnitConverterToolView } from "@/modules/tools/converters/unit-converter/ToolView";
import { ColorPaletteGeneratorToolView } from "@/modules/tools/converters/color-palette-generator/ToolView";
import { UserAgentParserToolView } from "@/modules/tools/network/user-agent-parser/ToolView";
import { CidrSubnetCalculatorToolView } from "@/modules/tools/network/cidr-subnet-calculator/ToolView";
import { FakeDataGeneratorToolView } from "@/modules/tools/generators/fake-data-generator/ToolView";

export const toolViewRegistry: Record<string, ComponentType> = {
  "json-formatter": JsonFormatterToolView,
  "json-yaml": JsonYamlToolView,
  "yaml-formatter": YamlFormatterToolView,
  "json-xml": JsonXmlToolView,
  "json-csv": JsonCsvToolView,
  "xml-formatter": XmlFormatterToolView,
  base64: Base64ToolView,
  "url-encode-decode": UrlEncodeToolView,
  "html-entity": HtmlEntityToolView,
  "jwt-decoder": JwtDecoderToolView,
  "hash-generator": HashGeneratorToolView,
  "uuid-generator": UuidGeneratorToolView,
  "password-generator": PasswordGeneratorToolView,
  "case-converter": CaseConverterToolView,
  "string-counter": StringCounterToolView,
  "lorem-ipsum": LoremIpsumToolView,
  "text-diff": TextDiffToolView,
  "regex-tester": RegexTesterToolView,
  "markdown-html": MarkdownHtmlToolView,
  "number-base-converter": NumberBaseConverterToolView,
  "unix-timestamp": UnixTimestampToolView,
  "color-converter": ColorConverterToolView,
  "js-ts-beautifier": JsTsBeautifierToolView,
  "css-beautifier": CssBeautifierToolView,
  "html-beautifier": HtmlBeautifierToolView,
  "cron-builder": CronBuilderToolView,
  "qr-code-generator": QrCodeGeneratorToolView,
  "random-generator": RandomGeneratorToolView,
  "uuid-bulk-generator": UuidBulkToolView,
  // Phase 2 (P1) tools
  "json-toml": JsonTomlToolView,
  "json-path-tester": JsonPathTesterToolView,
  "json-diff": JsonDiffToolView,
  "json-schema-generator": JsonSchemaGeneratorToolView,
  "json-to-types": JsonToTypesToolView,
  "sql-formatter": SqlFormatterToolView,
  "csv-tsv": CsvTsvToolView,
  "hex-text": HexTextToolView,
  "gzip-deflate": GzipDeflateToolView,
  "password-strength-analyzer": PasswordStrengthAnalyzerToolView,
  "hmac-generator": HmacGeneratorToolView,
  "line-sort-dedupe": LineSortDedupeToolView,
  slugify: SlugifyToolView,
  "text-table": TextTableToolView,
  "regex-cheatsheet": RegexCheatsheetToolView,
  "code-diff": CodeDiffToolView,
  "html-jsx": HtmlJsxToolView,
  "dotenv-formatter": DotenvFormatterToolView,
  "timezone-converter": TimezoneConverterToolView,
  "unit-converter": UnitConverterToolView,
  "color-palette-generator": ColorPaletteGeneratorToolView,
  "user-agent-parser": UserAgentParserToolView,
  "cidr-subnet-calculator": CidrSubnetCalculatorToolView,
  "fake-data-generator": FakeDataGeneratorToolView,
};
