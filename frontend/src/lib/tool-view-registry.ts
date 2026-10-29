

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
import { UrlParserToolView } from "@/modules/tools/network/url-parser/ToolView";
import { RomanNumeralConverterToolView } from "@/modules/tools/converters/roman-numeral-converter/ToolView";
import { BoxShadowBorderRadiusGeneratorToolView } from "@/modules/tools/converters/box-shadow-border-radius-generator/ToolView";
import { PunycodeIdnConverterToolView } from "@/modules/tools/encoding/punycode-idn-converter/ToolView";
import { CertificateDecoderToolView } from "@/modules/tools/encoding/certificate-decoder/ToolView";
import { RsaEcKeyPairGeneratorToolView } from "@/modules/tools/security/rsa-ec-key-pair-generator/ToolView";
import { TotpGeneratorToolView } from "@/modules/tools/security/totp-generator/ToolView";
import { BcryptArgon2HashVerifyToolView } from "@/modules/tools/security/bcrypt-argon2-hash-verify/ToolView";
import { CssTailwindHelperToolView } from "@/modules/tools/code/css-tailwind-helper/ToolView";
import { PlaceholderImageGeneratorToolView } from "@/modules/tools/image/placeholder-image-generator/ToolView";
import { ColorBlindnessSimulatorToolView } from "@/modules/tools/image/color-blindness-simulator/ToolView";
import { PlaceholderTextGeneratorToolView } from "@/modules/tools/generators/placeholder-text-generator/ToolView";
import { MockApiResponseGeneratorToolView } from "@/modules/tools/generators/mock-api-response-generator/ToolView";
import { ImageCompressorToolView } from "@/modules/tools/image/image-compressor/ToolView";
import { ImageFormatConverterToolView } from "@/modules/tools/image/image-format-converter/ToolView";
import { SvgExporterToolView } from "@/modules/tools/image/svg-exporter/ToolView";
import { SvgOptimizerToolView } from "@/modules/tools/image/svg-optimizer/ToolView";
import { QrCodeReaderToolView } from "@/modules/tools/image/qr-code-reader/ToolView";
import { FaviconGeneratorToolView } from "@/modules/tools/image/favicon-generator/ToolView";
import { CssGradientGeneratorToolView } from "@/modules/tools/converters/css-gradient-generator/ToolView";
import { HttpRequestTesterToolView } from "@/modules/tools/network/http-request-tester/ToolView";
import { DnsLookupToolView } from "@/modules/tools/network/dns-lookup/ToolView";
import { IpLookupToolView } from "@/modules/tools/network/ip-lookup/ToolView";
import { WebhookTesterToolView } from "@/modules/tools/network/webhook-tester/ToolView";
import { MetaTagPreviewerToolView } from "@/modules/tools/network/meta-tag-previewer/ToolView";
import { ExplainThisToolView } from "@/modules/tools/ai/explain-this/ToolView";
import { NlToCronToolView } from "@/modules/tools/ai/nl-to-cron/ToolView";
import { NlToRegexToolView } from "@/modules/tools/ai/nl-to-regex/ToolView";
import { AiJsonRepairToolView } from "@/modules/tools/ai/ai-json-repair/ToolView";
import { AiDiffSummaryToolView } from "@/modules/tools/ai/ai-diff-summary/ToolView";
import { GenerateFromExampleToolView } from "@/modules/tools/ai/generate-from-example/ToolView";
import { AiCommitMessageToolView } from "@/modules/tools/ai/ai-commit-message/ToolView";
import { CodeCommenterToolView } from "@/modules/tools/ai/code-commenter/ToolView";
import { ApiResponseToClientCodeToolView } from "@/modules/tools/ai/api-response-to-client-code/ToolView";
import { MorseCodeConverterToolView } from "@/modules/tools/converters/morse-code-converter/ToolView";
import { Base32ConverterToolView } from "@/modules/tools/encoding/base32-converter/ToolView";
import { UnicodeEscapeConverterToolView } from "@/modules/tools/encoding/unicode-escape-converter/ToolView";
import { NumberToWordsConverterToolView } from "@/modules/tools/converters/number-to-words-converter/ToolView";
import { Iso8601DurationConverterToolView } from "@/modules/tools/converters/iso-8601-duration-converter/ToolView";
import { PxRemConverterToolView } from "@/modules/tools/converters/px-rem-converter/ToolView";
import { QueryStringJsonToolView } from "@/modules/tools/data-format/query-string-json/ToolView";
import { CurlToCodeToolView } from "@/modules/tools/code/curl-to-code/ToolView";

import { NatoAlphabetConverterToolView } from "@/modules/tools/converters/nato-alphabet-converter/ToolView";

import { ClassicalCiphersToolView } from "@/modules/tools/text/classical-ciphers/ToolView";

import { ListConverterToolView } from "@/modules/tools/text/list-converter/ToolView";

import { StringEscapeToolView } from "@/modules/tools/text/string-escape/ToolView";

import { FindReplaceTextToolView } from "@/modules/tools/text/find-replace-text/ToolView";

import { WordFrequencyToolView } from "@/modules/tools/text/word-frequency/ToolView";

import { TextCleanerToolView } from "@/modules/tools/text/text-cleaner/ToolView";

import { EmailNormalizerToolView } from "@/modules/tools/text/email-normalizer/ToolView";

import { PropertiesYamlToolView } from "@/modules/tools/data-format/properties-yaml/ToolView";

import { YamlTomlToolView } from "@/modules/tools/data-format/yaml-toml/ToolView";

import { JsonToJavaToolView } from "@/modules/tools/data-format/json-to-java/ToolView";

import { JsonToSqlToolView } from "@/modules/tools/data-format/json-to-sql/ToolView";

import { NdjsonJsonToolView } from "@/modules/tools/data-format/ndjson-json/ToolView";

import { DockerRunToComposeToolView } from "@/modules/tools/code/docker-run-to-compose/ToolView";

import { ChmodCalculatorToolView } from "@/modules/tools/code/chmod-calculator/ToolView";

import { GitignoreGeneratorToolView } from "@/modules/tools/code/gitignore-generator/ToolView";

import { SemverToolToolView } from "@/modules/tools/code/semver-tool/ToolView";

import { KeycodeInfoToolView } from "@/modules/tools/code/keycode-info/ToolView";

import { HttpStatusCodesToolView } from "@/modules/tools/network/http-status-codes/ToolView";

import { MimeTypesToolView } from "@/modules/tools/network/mime-types/ToolView";

import { BasicAuthGeneratorToolView } from "@/modules/tools/network/basic-auth-generator/ToolView";

import { Ipv4AddressConverterToolView } from "@/modules/tools/network/ipv4-address-converter/ToolView";

import { Ipv4RangeExpanderToolView } from "@/modules/tools/network/ipv4-range-expander/ToolView";

import { MacAddressToolToolView } from "@/modules/tools/network/mac-address-tool/ToolView";

import { Ipv6UlaGeneratorToolView } from "@/modules/tools/network/ipv6-ula-generator/ToolView";

import { IbanValidatorToolView } from "@/modules/tools/converters/iban-validator/ToolView";

import { JwtEncoderToolView } from "@/modules/tools/security/jwt-encoder/ToolView";

import { AesEncryptDecryptToolView } from "@/modules/tools/security/aes-encrypt-decrypt/ToolView";

import { UlidNanoidGeneratorToolView } from "@/modules/tools/generators/ulid-nanoid-generator/ToolView";

import { RandomPortGeneratorToolView } from "@/modules/tools/generators/random-port-generator/ToolView";

import { LuhnValidatorToolView } from "@/modules/tools/security/luhn-validator/ToolView";

import { ColorContrastCheckerToolView } from "@/modules/tools/converters/color-contrast-checker/ToolView";

import { CssClampGeneratorToolView } from "@/modules/tools/code/css-clamp-generator/ToolView";

import { AspectRatioCalculatorToolView } from "@/modules/tools/converters/aspect-ratio-calculator/ToolView";

import { PercentageCalculatorToolView } from "@/modules/tools/converters/percentage-calculator/ToolView";

import { DateCalculatorToolView } from "@/modules/tools/converters/date-calculator/ToolView";

import { MathEvaluatorToolView } from "@/modules/tools/converters/math-evaluator/ToolView";

import { DownloadTimeCalculatorToolView } from "@/modules/tools/converters/download-time-calculator/ToolView";

import { Ieee754InspectorToolView } from "@/modules/tools/converters/ieee754-inspector/ToolView";

import { IndianNumberSystemConverterToolView } from "@/modules/tools/converters/indian-number-system-converter/ToolView";

import { BinaryTextConverterToolView } from "@/modules/tools/encoding/binary-text-converter/ToolView";

import { DataStorageConverterToolView } from "@/modules/tools/converters/data-storage-converter/ToolView";

import { BitwiseCalculatorToolView } from "@/modules/tools/converters/bitwise-calculator/ToolView";

import { EmiLoanCalculatorToolView } from "@/modules/tools/converters/emi-loan-calculator/ToolView";

import { CompoundInterestCalculatorToolView } from "@/modules/tools/converters/compound-interest-calculator/ToolView";

import { GstCalculatorToolView } from "@/modules/tools/converters/gst-calculator/ToolView";

import { IndianIdValidatorToolView } from "@/modules/tools/converters/indian-id-validator/ToolView";

import { PkceGeneratorToolView } from "@/modules/tools/security/pkce-generator/ToolView";

import { ChecksumCalculatorToolView } from "@/modules/tools/encoding/checksum-calculator/ToolView";

import { HttpHeaderAnalyzerToolView } from "@/modules/tools/network/http-header-analyzer/ToolView";

import { CookieParserToolView } from "@/modules/tools/network/cookie-parser/ToolView";

import { PortReferenceToolView } from "@/modules/tools/network/port-reference/ToolView";

import { JavaStacktraceAnalyzerToolView } from "@/modules/tools/text/java-stacktrace-analyzer/ToolView";

import { ReadingTimeEstimatorToolView } from "@/modules/tools/text/reading-time-estimator/ToolView";
import { PassphraseGeneratorToolView } from "@/modules/tools/generators/passphrase-generator/ToolView";
import { JavaDateFormatConverterToolView } from "@/modules/tools/code/java-date-format-converter/ToolView";
import { OpenapiViewerToolView } from "@/modules/tools/data-format/openapi-viewer/ToolView";
import { IdDecoderToolView } from "@/modules/tools/encoding/id-decoder/ToolView";
import { Base58Base62ConverterToolView } from "@/modules/tools/encoding/base58-base62-converter/ToolView";
import { HashIdentifierToolView } from "@/modules/tools/security/hash-identifier/ToolView";
import { Json5JsoncConverterToolView } from "@/modules/tools/data-format/json5-jsonc-converter/ToolView";
import { KubernetesSecretEncoderToolView } from "@/modules/tools/data-format/kubernetes-secret-encoder/ToolView";
import { KubernetesResourceConverterToolView } from "@/modules/tools/converters/kubernetes-resource-converter/ToolView";
import { NumberTheoryCalculatorToolView } from "@/modules/tools/converters/number-theory-calculator/ToolView";
import { StatisticsCalculatorToolView } from "@/modules/tools/converters/statistics-calculator/ToolView";
import { DurationConverterToolView } from "@/modules/tools/converters/duration-converter/ToolView";
import { HexDumpViewerToolView } from "@/modules/tools/encoding/hex-dump-viewer/ToolView";
import { UnicodeInspectorToolView } from "@/modules/tools/text/unicode-inspector/ToolView";
import { MarkdownTocGeneratorToolView } from "@/modules/tools/text/markdown-toc-generator/ToolView";
import { GlobPatternTesterToolView } from "@/modules/tools/code/glob-pattern-tester/ToolView";
import { ConventionalCommitLinterToolView } from "@/modules/tools/code/conventional-commit-linter/ToolView";
import { UtmLinkBuilderToolView } from "@/modules/tools/network/utm-link-builder/ToolView";
import { CacheControlBuilderToolView } from "@/modules/tools/network/cache-control-builder/ToolView";
import { CspBuilderToolView } from "@/modules/tools/security/csp-builder/ToolView";
import { IcsEventGeneratorToolView } from "@/modules/tools/generators/ics-event-generator/ToolView";
import { LicenseGeneratorToolView } from "@/modules/tools/generators/license-generator/ToolView";
import { RobotsTxtGeneratorToolView } from "@/modules/tools/network/robots-txt-generator/ToolView";
import { ReadabilityAnalyzerToolView } from "@/modules/tools/text/readability-analyzer/ToolView";
import { StringSimilarityToolView } from "@/modules/tools/text/string-similarity/ToolView";
import { FancyTextGeneratorToolView } from "@/modules/tools/text/fancy-text-generator/ToolView";
import { AccessLogAnalyzerToolView } from "@/modules/tools/text/access-log-analyzer/ToolView";
import { EnvFileCompareToolView } from "@/modules/tools/code/env-file-compare/ToolView";
import { DockerfileLinterToolView } from "@/modules/tools/code/dockerfile-linter/ToolView";
import { GraphqlFormatterToolView } from "@/modules/tools/code/graphql-formatter/ToolView";
import { SshKeyFingerprintToolView } from "@/modules/tools/security/ssh-key-fingerprint/ToolView";
import { CvssCalculatorToolView } from "@/modules/tools/security/cvss-calculator/ToolView";
import { IpCidrMatcherToolView } from "@/modules/tools/network/ip-cidr-matcher/ToolView";
import { Ipv6AddressToolToolView } from "@/modules/tools/network/ipv6-address-tool/ToolView";
import { SpfDmarcBuilderToolView } from "@/modules/tools/network/spf-dmarc-builder/ToolView";
import { SitemapXmlGeneratorToolView } from "@/modules/tools/network/sitemap-xml-generator/ToolView";
import { RedirectRuleGeneratorToolView } from "@/modules/tools/network/redirect-rule-generator/ToolView";
import { CoordinateConverterToolView } from "@/modules/tools/converters/coordinate-converter/ToolView";
import { IsbnGtinValidatorToolView } from "@/modules/tools/converters/isbn-gtin-validator/ToolView";
import { JsonFlattenToolView } from "@/modules/tools/data-format/json-flatten/ToolView";
import { IniJsonConverterToolView } from "@/modules/tools/data-format/ini-json-converter/ToolView";
import { HarViewerToolView } from "@/modules/tools/data-format/har-viewer/ToolView";
import { SecurityTxtGeneratorToolView } from "@/modules/tools/generators/security-txt-generator/ToolView";
import { EditorconfigGeneratorToolView } from "@/modules/tools/generators/editorconfig-generator/ToolView";
import { SystemdUnitGeneratorToolView } from "@/modules/tools/generators/systemd-unit-generator/ToolView";
import { GithubActionsGeneratorToolView } from "@/modules/tools/generators/github-actions-generator/ToolView";
import { DnsZoneRecordBuilderToolView } from "@/modules/tools/network/dns-zone-record-builder/ToolView";
import { LinkHeaderParserToolView } from "@/modules/tools/network/link-header-parser/ToolView";
import { SecretScannerToolView } from "@/modules/tools/security/secret-scanner/ToolView";
import { AnsiEscapeStripperToolView } from "@/modules/tools/text/ansi-escape-stripper/ToolView";
import { MarkdownTableFormatterToolView } from "@/modules/tools/text/markdown-table-formatter/ToolView";
import { CsvToSqlInsertToolView } from "@/modules/tools/data-format/csv-to-sql-insert/ToolView";
import { JsonSortKeysToolView } from "@/modules/tools/data-format/json-sort-keys/ToolView";
import { JsonToGoPythonToolView } from "@/modules/tools/code/json-to-go-python/ToolView";
import { MusicNoteFrequencyToolView } from "@/modules/tools/converters/music-note-frequency/ToolView";
import { FractionDecimalConverterToolView } from "@/modules/tools/converters/fraction-decimal-converter/ToolView";
import { MavenGradleDependencyConverterToolView } from "@/modules/tools/code/maven-gradle-dependency-converter/ToolView";
import { SpringPropertyEnvConverterToolView } from "@/modules/tools/code/spring-property-env-converter/ToolView";
import { JdbcUrlBuilderToolView } from "@/modules/tools/code/jdbc-url-builder/ToolView";
import { JsonToZodToolView } from "@/modules/tools/code/json-to-zod/ToolView";
import { JsonToKotlinSwiftToolView } from "@/modules/tools/code/json-to-kotlin-swift/ToolView";
import { PackageJsonValidatorToolView } from "@/modules/tools/code/package-json-validator/ToolView";
import { KubernetesManifestLinterToolView } from "@/modules/tools/code/kubernetes-manifest-linter/ToolView";
import { HtpasswdGeneratorToolView } from "@/modules/tools/security/htpasswd-generator/ToolView";
import { OpensslCommandBuilderToolView } from "@/modules/tools/security/openssl-command-builder/ToolView";
import { PiiMaskerToolView } from "@/modules/tools/security/pii-masker/ToolView";
import { CidrAggregatorToolView } from "@/modules/tools/network/cidr-aggregator/ToolView";
import { CorsConfigGeneratorToolView } from "@/modules/tools/network/cors-config-generator/ToolView";
import { KongConfigGeneratorToolView } from "@/modules/tools/network/kong-config-generator/ToolView";
import { NginxConfigGeneratorToolView } from "@/modules/tools/network/nginx-config-generator/ToolView";
import { LineToolsToolView } from "@/modules/tools/text/line-tools/ToolView";
import { UnicodeNormalizerToolView } from "@/modules/tools/text/unicode-normalizer/ToolView";
import { SubtitleConverterToolView } from "@/modules/tools/text/subtitle-converter/ToolView";
import { EpochFormatConverterToolView } from "@/modules/tools/converters/epoch-format-converter/ToolView";
import { NumberFormatterToolView } from "@/modules/tools/converters/number-formatter/ToolView";
import { ElectronicsCalculatorToolView } from "@/modules/tools/converters/electronics-calculator/ToolView";
import { SipCalculatorToolView } from "@/modules/tools/converters/sip-calculator/ToolView";
import { JsonPatchToolToolView } from "@/modules/tools/data-format/json-patch-tool/ToolView";
import { YamlAnchorExpanderToolView } from "@/modules/tools/data-format/yaml-anchor-expander/ToolView";
import { CsvProfilerToolView } from "@/modules/tools/data-format/csv-profiler/ToolView";
import { AsciiTableParserToolView } from "@/modules/tools/data-format/ascii-table-parser/ToolView";
import { BadgeGeneratorToolView } from "@/modules/tools/generators/badge-generator/ToolView";
import { MavenPomGeneratorToolView } from "@/modules/tools/generators/maven-pom-generator/ToolView";
import { SpringConfigGeneratorToolView } from "@/modules/tools/generators/spring-config-generator/ToolView";
import { WebAppManifestGeneratorToolView } from "@/modules/tools/generators/web-app-manifest-generator/ToolView";
import { BigdecimalRoundingToolView } from "@/modules/tools/code/bigdecimal-rounding/ToolView";
import { CssSpecificityCalculatorToolView } from "@/modules/tools/code/css-specificity-calculator/ToolView";
import { DatabaseErrorLookupToolView } from "@/modules/tools/code/database-error-lookup/ToolView";
import { DockerComposeToKubernetesToolView } from "@/modules/tools/code/docker-compose-to-kubernetes/ToolView";
import { JavaClassToJsonToolView } from "@/modules/tools/code/java-class-to-json/ToolView";
import { JvmFlagsExplainerToolView } from "@/modules/tools/code/jvm-flags-explainer/ToolView";
import { SqlDdlToJpaEntityToolView } from "@/modules/tools/code/sql-ddl-to-jpa-entity/ToolView";
import { SqlInClauseBuilderToolView } from "@/modules/tools/code/sql-in-clause-builder/ToolView";
import { ThreadDumpAnalyzerToolView } from "@/modules/tools/code/thread-dump-analyzer/ToolView";
import { ExcelColumnConverterToolView } from "@/modules/tools/converters/excel-column-converter/ToolView";
import { SlaUptimeCalculatorToolView } from "@/modules/tools/converters/sla-uptime-calculator/ToolView";
import { XirrCagrCalculatorToolView } from "@/modules/tools/converters/xirr-cagr-calculator/ToolView";
import { Iso8583ParserToolView } from "@/modules/tools/data-format/iso8583-parser/ToolView";
import { JsonSchemaValidatorToolView } from "@/modules/tools/data-format/json-schema-validator/ToolView";
import { JsonToOpenapiSchemaToolView } from "@/modules/tools/data-format/json-to-openapi-schema/ToolView";
import { PostmanToCurlToolView } from "@/modules/tools/data-format/postman-to-curl/ToolView";
import { ProtoToTypescriptToolView } from "@/modules/tools/data-format/proto-to-typescript/ToolView";
import { StructuredLogConverterToolView } from "@/modules/tools/data-format/structured-log-converter/ToolView";
import { Asn1DerDecoderToolView } from "@/modules/tools/encoding/asn1-der-decoder/ToolView";
import { EbcdicConverterToolView } from "@/modules/tools/encoding/ebcdic-converter/ToolView";
import { EmvTlvDecoderToolView } from "@/modules/tools/encoding/emv-tlv-decoder/ToolView";
import { LegacyTextEncodingsToolView } from "@/modules/tools/encoding/legacy-text-encodings/ToolView";
import { MsgpackCborJsonToolView } from "@/modules/tools/encoding/msgpack-cbor-json/ToolView";
import { PackedDecimalConverterToolView } from "@/modules/tools/encoding/packed-decimal-converter/ToolView";
import { ProtobufBinaryDecoderToolView } from "@/modules/tools/encoding/protobuf-binary-decoder/ToolView";
import { DockerComposeGeneratorToolView } from "@/modules/tools/generators/docker-compose-generator/ToolView";
import { DockerfileGeneratorToolView } from "@/modules/tools/generators/dockerfile-generator/ToolView";
import { KubernetesManifestGeneratorToolView } from "@/modules/tools/generators/kubernetes-manifest-generator/ToolView";
import { LogbackConfigGeneratorToolView } from "@/modules/tools/generators/logback-config-generator/ToolView";
import { ApigeePolicyGeneratorToolView } from "@/modules/tools/network/apigee-policy-generator/ToolView";
import { EmailHeaderAnalyzerToolView } from "@/modules/tools/network/email-header-analyzer/ToolView";
import { SecurityHeadersGeneratorToolView } from "@/modules/tools/network/security-headers-generator/ToolView";
import { TlsCipherSuiteLookupToolView } from "@/modules/tools/network/tls-cipher-suite-lookup/ToolView";
import { VlsmSubnetPlannerToolView } from "@/modules/tools/network/vlsm-subnet-planner/ToolView";
import { AwsIamPolicyAnalyzerToolView } from "@/modules/tools/security/aws-iam-policy-analyzer/ToolView";
import { AwsSigv4CalculatorToolView } from "@/modules/tools/security/aws-sigv4-calculator/ToolView";
import { JwksInspectorToolView } from "@/modules/tools/security/jwks-inspector/ToolView";
import { OauthRequestBuilderToolView } from "@/modules/tools/security/oauth-request-builder/ToolView";
import { SamlDecoderToolView } from "@/modules/tools/security/saml-decoder/ToolView";
import { WebhookSignatureVerifierToolView } from "@/modules/tools/security/webhook-signature-verifier/ToolView";
import { ChangelogGeneratorToolView } from "@/modules/tools/text/changelog-generator/ToolView";
import { MarkdownJiraConverterToolView } from "@/modules/tools/text/markdown-jira-converter/ToolView";
import { TemplateBulkGeneratorToolView } from "@/modules/tools/text/template-bulk-generator/ToolView";
import { UnifiedDiffApplierToolView } from "@/modules/tools/text/unified-diff-applier/ToolView";

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
  "url-parser": UrlParserToolView,
  "roman-numeral-converter": RomanNumeralConverterToolView,
  "box-shadow-border-radius-generator": BoxShadowBorderRadiusGeneratorToolView,
  "punycode-idn-converter": PunycodeIdnConverterToolView,
  "certificate-decoder": CertificateDecoderToolView,
  "rsa-ec-key-pair-generator": RsaEcKeyPairGeneratorToolView,
  "totp-generator": TotpGeneratorToolView,
  "bcrypt-argon2-hash-verify": BcryptArgon2HashVerifyToolView,
  "css-tailwind-helper": CssTailwindHelperToolView,
  "placeholder-image-generator": PlaceholderImageGeneratorToolView,
  "color-blindness-simulator": ColorBlindnessSimulatorToolView,
  "placeholder-text-generator": PlaceholderTextGeneratorToolView,
  "mock-api-response-generator": MockApiResponseGeneratorToolView,
  "image-compressor": ImageCompressorToolView,
  "image-format-converter": ImageFormatConverterToolView,
  "svg-exporter": SvgExporterToolView,
  "svg-optimizer": SvgOptimizerToolView,
  "qr-code-reader": QrCodeReaderToolView,
  "favicon-generator": FaviconGeneratorToolView,
  "css-gradient-generator": CssGradientGeneratorToolView,
  "http-request-tester": HttpRequestTesterToolView,
  "dns-lookup": DnsLookupToolView,
  "ip-lookup": IpLookupToolView,
  "webhook-tester": WebhookTesterToolView,
  "meta-tag-previewer": MetaTagPreviewerToolView,
  "explain-this": ExplainThisToolView,
  "nl-to-cron": NlToCronToolView,
  "nl-to-regex": NlToRegexToolView,
  "ai-json-repair": AiJsonRepairToolView,
  "ai-diff-summary": AiDiffSummaryToolView,
  "generate-from-example": GenerateFromExampleToolView,
  "ai-commit-message": AiCommitMessageToolView,
  "code-commenter": CodeCommenterToolView,
  "api-response-to-client-code": ApiResponseToClientCodeToolView,
  "morse-code-converter": MorseCodeConverterToolView,
  "base32-converter": Base32ConverterToolView,
  "unicode-escape-converter": UnicodeEscapeConverterToolView,
  "number-to-words-converter": NumberToWordsConverterToolView,
  "iso-8601-duration-converter": Iso8601DurationConverterToolView,
  "px-rem-converter": PxRemConverterToolView,
  "query-string-json": QueryStringJsonToolView,
  "curl-to-code": CurlToCodeToolView,
  "nato-alphabet-converter": NatoAlphabetConverterToolView,
  "classical-ciphers": ClassicalCiphersToolView,
  "list-converter": ListConverterToolView,
  "string-escape": StringEscapeToolView,
  "find-replace-text": FindReplaceTextToolView,
  "word-frequency": WordFrequencyToolView,
  "text-cleaner": TextCleanerToolView,
  "email-normalizer": EmailNormalizerToolView,
  "properties-yaml": PropertiesYamlToolView,
  "yaml-toml": YamlTomlToolView,
  "json-to-java": JsonToJavaToolView,
  "json-to-sql": JsonToSqlToolView,
  "ndjson-json": NdjsonJsonToolView,
  "docker-run-to-compose": DockerRunToComposeToolView,
  "chmod-calculator": ChmodCalculatorToolView,
  "gitignore-generator": GitignoreGeneratorToolView,
  "semver-tool": SemverToolToolView,
  "keycode-info": KeycodeInfoToolView,
  "http-status-codes": HttpStatusCodesToolView,
  "mime-types": MimeTypesToolView,
  "basic-auth-generator": BasicAuthGeneratorToolView,
  "ipv4-address-converter": Ipv4AddressConverterToolView,
  "ipv4-range-expander": Ipv4RangeExpanderToolView,
  "mac-address-tool": MacAddressToolToolView,
  "ipv6-ula-generator": Ipv6UlaGeneratorToolView,
  "iban-validator": IbanValidatorToolView,
  "jwt-encoder": JwtEncoderToolView,
  "aes-encrypt-decrypt": AesEncryptDecryptToolView,
  "ulid-nanoid-generator": UlidNanoidGeneratorToolView,
  "random-port-generator": RandomPortGeneratorToolView,
  "luhn-validator": LuhnValidatorToolView,
  "color-contrast-checker": ColorContrastCheckerToolView,
  "css-clamp-generator": CssClampGeneratorToolView,
  "aspect-ratio-calculator": AspectRatioCalculatorToolView,
  "percentage-calculator": PercentageCalculatorToolView,
  "date-calculator": DateCalculatorToolView,
  "math-evaluator": MathEvaluatorToolView,
  "download-time-calculator": DownloadTimeCalculatorToolView,
  "ieee754-inspector": Ieee754InspectorToolView,
  "indian-number-system-converter": IndianNumberSystemConverterToolView,
  "binary-text-converter": BinaryTextConverterToolView,
  "data-storage-converter": DataStorageConverterToolView,
  "bitwise-calculator": BitwiseCalculatorToolView,
  "emi-loan-calculator": EmiLoanCalculatorToolView,
  "compound-interest-calculator": CompoundInterestCalculatorToolView,
  "gst-calculator": GstCalculatorToolView,
  "indian-id-validator": IndianIdValidatorToolView,
  "pkce-generator": PkceGeneratorToolView,
  "checksum-calculator": ChecksumCalculatorToolView,
  "http-header-analyzer": HttpHeaderAnalyzerToolView,
  "cookie-parser": CookieParserToolView,
  "port-reference": PortReferenceToolView,
  "java-stacktrace-analyzer": JavaStacktraceAnalyzerToolView,
  "reading-time-estimator": ReadingTimeEstimatorToolView,
  "passphrase-generator": PassphraseGeneratorToolView,
  "java-date-format-converter": JavaDateFormatConverterToolView,
  "openapi-viewer": OpenapiViewerToolView,
  "id-decoder": IdDecoderToolView,
  "base58-base62-converter": Base58Base62ConverterToolView,
  "hash-identifier": HashIdentifierToolView,
  "json5-jsonc-converter": Json5JsoncConverterToolView,
  "kubernetes-secret-encoder": KubernetesSecretEncoderToolView,
  "kubernetes-resource-converter": KubernetesResourceConverterToolView,
  "number-theory-calculator": NumberTheoryCalculatorToolView,
  "statistics-calculator": StatisticsCalculatorToolView,
  "duration-converter": DurationConverterToolView,
  "hex-dump-viewer": HexDumpViewerToolView,
  "unicode-inspector": UnicodeInspectorToolView,
  "markdown-toc-generator": MarkdownTocGeneratorToolView,
  "glob-pattern-tester": GlobPatternTesterToolView,
  "conventional-commit-linter": ConventionalCommitLinterToolView,
  "utm-link-builder": UtmLinkBuilderToolView,
  "cache-control-builder": CacheControlBuilderToolView,
  "csp-builder": CspBuilderToolView,
  "ics-event-generator": IcsEventGeneratorToolView,
  "license-generator": LicenseGeneratorToolView,
  "robots-txt-generator": RobotsTxtGeneratorToolView,
  "readability-analyzer": ReadabilityAnalyzerToolView,
  "string-similarity": StringSimilarityToolView,
  "fancy-text-generator": FancyTextGeneratorToolView,
  "access-log-analyzer": AccessLogAnalyzerToolView,
  "env-file-compare": EnvFileCompareToolView,
  "dockerfile-linter": DockerfileLinterToolView,
  "graphql-formatter": GraphqlFormatterToolView,
  "ssh-key-fingerprint": SshKeyFingerprintToolView,
  "cvss-calculator": CvssCalculatorToolView,
  "ip-cidr-matcher": IpCidrMatcherToolView,
  "ipv6-address-tool": Ipv6AddressToolToolView,
  "spf-dmarc-builder": SpfDmarcBuilderToolView,
  "sitemap-xml-generator": SitemapXmlGeneratorToolView,
  "redirect-rule-generator": RedirectRuleGeneratorToolView,
  "coordinate-converter": CoordinateConverterToolView,
  "isbn-gtin-validator": IsbnGtinValidatorToolView,
  "json-flatten": JsonFlattenToolView,
  "ini-json-converter": IniJsonConverterToolView,
  "har-viewer": HarViewerToolView,
  "security-txt-generator": SecurityTxtGeneratorToolView,
  "editorconfig-generator": EditorconfigGeneratorToolView,
  "systemd-unit-generator": SystemdUnitGeneratorToolView,
  "github-actions-generator": GithubActionsGeneratorToolView,
  "dns-zone-record-builder": DnsZoneRecordBuilderToolView,
  "link-header-parser": LinkHeaderParserToolView,
  "secret-scanner": SecretScannerToolView,
  "ansi-escape-stripper": AnsiEscapeStripperToolView,
  "markdown-table-formatter": MarkdownTableFormatterToolView,
  "csv-to-sql-insert": CsvToSqlInsertToolView,
  "json-sort-keys": JsonSortKeysToolView,
  "json-to-go-python": JsonToGoPythonToolView,
  "music-note-frequency": MusicNoteFrequencyToolView,
  "fraction-decimal-converter": FractionDecimalConverterToolView,
  "maven-gradle-dependency-converter": MavenGradleDependencyConverterToolView,
  "spring-property-env-converter": SpringPropertyEnvConverterToolView,
  "jdbc-url-builder": JdbcUrlBuilderToolView,
  "json-to-zod": JsonToZodToolView,
  "json-to-kotlin-swift": JsonToKotlinSwiftToolView,
  "package-json-validator": PackageJsonValidatorToolView,
  "kubernetes-manifest-linter": KubernetesManifestLinterToolView,
  "htpasswd-generator": HtpasswdGeneratorToolView,
  "openssl-command-builder": OpensslCommandBuilderToolView,
  "pii-masker": PiiMaskerToolView,
  "cidr-aggregator": CidrAggregatorToolView,
  "cors-config-generator": CorsConfigGeneratorToolView,
  "kong-config-generator": KongConfigGeneratorToolView,
  "nginx-config-generator": NginxConfigGeneratorToolView,
  "line-tools": LineToolsToolView,
  "unicode-normalizer": UnicodeNormalizerToolView,
  "subtitle-converter": SubtitleConverterToolView,
  "epoch-format-converter": EpochFormatConverterToolView,
  "number-formatter": NumberFormatterToolView,
  "electronics-calculator": ElectronicsCalculatorToolView,
  "sip-calculator": SipCalculatorToolView,
  "json-patch-tool": JsonPatchToolToolView,
  "yaml-anchor-expander": YamlAnchorExpanderToolView,
  "csv-profiler": CsvProfilerToolView,
  "ascii-table-parser": AsciiTableParserToolView,
  "badge-generator": BadgeGeneratorToolView,
  "maven-pom-generator": MavenPomGeneratorToolView,
  "spring-config-generator": SpringConfigGeneratorToolView,
  "web-app-manifest-generator": WebAppManifestGeneratorToolView,
  "bigdecimal-rounding": BigdecimalRoundingToolView,
  "css-specificity-calculator": CssSpecificityCalculatorToolView,
  "database-error-lookup": DatabaseErrorLookupToolView,
  "docker-compose-to-kubernetes": DockerComposeToKubernetesToolView,
  "java-class-to-json": JavaClassToJsonToolView,
  "jvm-flags-explainer": JvmFlagsExplainerToolView,
  "sql-ddl-to-jpa-entity": SqlDdlToJpaEntityToolView,
  "sql-in-clause-builder": SqlInClauseBuilderToolView,
  "thread-dump-analyzer": ThreadDumpAnalyzerToolView,
  "excel-column-converter": ExcelColumnConverterToolView,
  "sla-uptime-calculator": SlaUptimeCalculatorToolView,
  "xirr-cagr-calculator": XirrCagrCalculatorToolView,
  "iso8583-parser": Iso8583ParserToolView,
  "json-schema-validator": JsonSchemaValidatorToolView,
  "json-to-openapi-schema": JsonToOpenapiSchemaToolView,
  "postman-to-curl": PostmanToCurlToolView,
  "proto-to-typescript": ProtoToTypescriptToolView,
  "structured-log-converter": StructuredLogConverterToolView,
  "asn1-der-decoder": Asn1DerDecoderToolView,
  "ebcdic-converter": EbcdicConverterToolView,
  "emv-tlv-decoder": EmvTlvDecoderToolView,
  "legacy-text-encodings": LegacyTextEncodingsToolView,
  "msgpack-cbor-json": MsgpackCborJsonToolView,
  "packed-decimal-converter": PackedDecimalConverterToolView,
  "protobuf-binary-decoder": ProtobufBinaryDecoderToolView,
  "docker-compose-generator": DockerComposeGeneratorToolView,
  "dockerfile-generator": DockerfileGeneratorToolView,
  "kubernetes-manifest-generator": KubernetesManifestGeneratorToolView,
  "logback-config-generator": LogbackConfigGeneratorToolView,
  "apigee-policy-generator": ApigeePolicyGeneratorToolView,
  "email-header-analyzer": EmailHeaderAnalyzerToolView,
  "security-headers-generator": SecurityHeadersGeneratorToolView,
  "tls-cipher-suite-lookup": TlsCipherSuiteLookupToolView,
  "vlsm-subnet-planner": VlsmSubnetPlannerToolView,
  "aws-iam-policy-analyzer": AwsIamPolicyAnalyzerToolView,
  "aws-sigv4-calculator": AwsSigv4CalculatorToolView,
  "jwks-inspector": JwksInspectorToolView,
  "oauth-request-builder": OauthRequestBuilderToolView,
  "saml-decoder": SamlDecoderToolView,
  "webhook-signature-verifier": WebhookSignatureVerifierToolView,
  "changelog-generator": ChangelogGeneratorToolView,
  "markdown-jira-converter": MarkdownJiraConverterToolView,
  "template-bulk-generator": TemplateBulkGeneratorToolView,
  "unified-diff-applier": UnifiedDiffApplierToolView,
};
