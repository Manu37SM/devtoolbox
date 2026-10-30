/**
 * Shared input/output utilities for tool pages: per-tool file and download
 * settings, plus the pure helpers behind the input and output toolbars
 * (file reading, download naming, text statistics). Kept free of React so it
 * can be unit tested in the node test environment.
 */

/** How a file opened into, or dropped onto, a tool input becomes text. */
export type FileReadMode =
  /** Read as UTF-8 text; refuse files that look binary. */
  | "text"
  /** Text files load as text; binary files load as spaced hex bytes. */
  | "auto-hex"
  /** Text files load as text; binary files load as base64. */
  | "auto-base64"
  /** Text files load as text; binary (DER) files are wrapped as a PEM certificate. */
  | "auto-pem";

export interface ToolIoConfig {
  /** Exact file name for "Download output" (e.g. "Dockerfile", "compose.yaml"). */
  downloadName?: string;
  /** Extension to use when the output's content does not reveal its type. */
  ext?: string;
  /** File picker filter for "Open file". Omit to allow any file. */
  accept?: string;
  fileRead?: FileReadMode;
  /**
   * Show "Use output as input". Only for tools whose output is valid input for
   * the same tool (formatters, encoders, reversible converters), so chaining
   * means something: decode twice, convert back, re-run a cleanup.
   */
  chain?: boolean;
  /** Example input for tools whose input starts empty ("Load example"). */
  sample?: string;
}

const C = { chain: true } as const;

/**
 * Per-tool settings. Tools not listed get the defaults: text files, a download
 * named after the tool with an extension sniffed from the output, no chaining.
 */
export const TOOL_IO: Record<string, ToolIoConfig> = {
  // ---- data formats --------------------------------------------------------
  "json-formatter": { ...C, ext: "json", accept: ".json,.txt,application/json" },
  "json-yaml": { ...C, ext: "yaml", accept: ".json,.yaml,.yml,.txt" },
  "yaml-formatter": { ...C, ext: "yaml", accept: ".yaml,.yml,.txt" },
  "json-xml": { ...C, ext: "xml", accept: ".json,.xml,.txt" },
  "json-csv": { ...C, ext: "csv", accept: ".json,.csv,.txt" },
  "csv-tsv": { ...C, ext: "csv", accept: ".csv,.tsv,.txt" },
  "xml-formatter": { ...C, ext: "xml", accept: ".xml,.txt" },
  "json-toml": { ...C, ext: "toml", accept: ".json,.toml,.txt" },
  "yaml-toml": { ...C, ext: "toml", accept: ".yaml,.yml,.toml,.txt" },
  "ini-json-converter": { ...C, ext: "ini", accept: ".ini,.cfg,.conf,.json,.txt" },
  "properties-yaml": { ...C, ext: "yaml", accept: ".properties,.yaml,.yml,.txt" },
  "ndjson-json": { ...C, ext: "ndjson", accept: ".ndjson,.jsonl,.json,.txt" },
  "json5-jsonc-converter": { ...C, ext: "json", accept: ".json5,.jsonc,.json,.txt" },
  "json-sort-keys": { ...C, ext: "json", accept: ".json,.txt" },
  "json-flatten": { ...C, ext: "json", accept: ".json,.txt" },
  "json-diff": { accept: ".json,.txt" },
  "json-patch-tool": { ext: "json", accept: ".json,.txt" },
  "json-path-tester": { ext: "json", accept: ".json,.txt" },
  "json-schema-generator": { downloadName: "schema.json", accept: ".json,.txt" },
  "json-schema-validator": { accept: ".json,.txt" },
  "json-to-java": { ext: "java", accept: ".json,.txt" },
  "json-to-sql": { ext: "sql", accept: ".json,.txt" },
  "json-to-types": { ext: "ts", accept: ".json,.txt" },
  "json-to-openapi-schema": { downloadName: "openapi.yaml", accept: ".json,.txt" },
  "query-string-json": { ...C, accept: ".json,.txt" },
  "sql-formatter": { ...C, ext: "sql", accept: ".sql,.txt" },
  "csv-to-sql-insert": { ext: "sql", accept: ".csv,.tsv,.txt" },
  "csv-profiler": { accept: ".csv,.tsv,.txt" },
  "har-viewer": { accept: ".har,.json" },
  "openapi-viewer": { accept: ".json,.yaml,.yml" },
  "postman-to-curl": { ext: "sh", accept: ".json,.postman_collection" },
  "proto-to-typescript": { ext: "ts", accept: ".proto,.txt" },
  "yaml-anchor-expander": { ...C, ext: "yaml", accept: ".yaml,.yml,.txt" },
  "kubernetes-secret-encoder": { downloadName: "secret.yaml", accept: ".yaml,.yml,.env,.txt" },
  "structured-log-converter": { ...C, ext: "log", accept: ".log,.json,.jsonl,.ndjson,.txt" },
  "iso8583-parser": { fileRead: "auto-hex" },
  "ascii-table-parser": { ext: "csv" },

  "csv-diff": { ext: "csv", accept: ".csv,.tsv,.txt" },
  "csv-join": { ext: "csv", accept: ".csv,.tsv,.txt" },
  "sql-insert-parser": { ext: "csv", accept: ".sql,.txt" },
  "json-schema-sample-generator": { ext: "json", accept: ".json,.txt" },
  // ---- encoding ------------------------------------------------------------
  base64: { ...C, fileRead: "auto-base64" },
  "base32-converter": C,
  "base58-base62-converter": C,
  "hex-text": { ...C, fileRead: "auto-hex" },
  "hex-dump-viewer": { fileRead: "auto-hex" },
  "binary-text-converter": C,
  "url-encode-decode": C,
  "html-entity": C,
  "unicode-escape-converter": C,
  "gzip-deflate": { ...C, fileRead: "auto-base64" },
  "punycode-idn-converter": C,
  "asn1-der-decoder": { fileRead: "auto-hex", accept: ".der,.cer,.crt,.pem,.p7b,.p7c,.csr,.key,.bin" },
  "protobuf-binary-decoder": { fileRead: "auto-hex", accept: ".bin,.pb,.protobuf" },
  "msgpack-cbor-json": { ...C, fileRead: "auto-hex" },
  "ebcdic-converter": { ...C, fileRead: "auto-hex" },
  "emv-tlv-decoder": { fileRead: "auto-hex" },
  "certificate-decoder": { fileRead: "auto-pem", accept: ".pem,.crt,.cer,.der" },
  "packed-decimal-converter": { ...C, fileRead: "auto-hex" },
  "legacy-text-encodings": C,

  // ---- code ----------------------------------------------------------------
  "css-beautifier": { ...C, ext: "css", accept: ".css,.scss,.txt" },
  "html-beautifier": { ...C, ext: "html", accept: ".html,.htm,.txt" },
  "js-ts-beautifier": { ...C, ext: "js", accept: ".js,.mjs,.cjs,.ts,.tsx,.jsx,.txt" },
  "graphql-formatter": { ...C, ext: "graphql", accept: ".graphql,.gql,.txt" },
  "html-jsx": { ext: "jsx", accept: ".html,.htm,.txt" },
  "dotenv-formatter": { ...C, downloadName: ".env", accept: ".env,.txt" },
  "env-file-compare": { accept: ".env,.txt" },
  "docker-run-to-compose": { downloadName: "compose.yaml" },
  "docker-compose-to-kubernetes": { downloadName: "k8s.yaml", accept: ".yaml,.yml" },
  "kubernetes-manifest-linter": { accept: ".yaml,.yml" },
  "package-json-validator": { accept: ".json" },
  "gitignore-generator": { downloadName: ".gitignore" },
  "json-to-go-python": { accept: ".json,.txt" },
  "json-to-kotlin-swift": { accept: ".json,.txt" },
  "json-to-zod": { ext: "ts", accept: ".json,.txt" },
  "maven-gradle-dependency-converter": { ...C, accept: ".xml,.gradle,.kts,.txt" },
  "spring-property-env-converter": { ...C, accept: ".properties,.yaml,.yml,.env,.txt" },
  "sql-ddl-to-jpa-entity": { ext: "java", accept: ".sql,.ddl,.txt" },
  "sql-in-clause-builder": { ext: "sql", accept: ".csv,.txt" },
  "java-class-to-json": { accept: ".java,.txt" },
  "thread-dump-analyzer": { accept: ".txt,.tdump,.log" },
  "database-error-lookup": { accept: ".log,.txt" },
  "css-tailwind-helper": { ext: "css" },
  "css-clamp-generator": { ext: "css" },
  "code-diff": { ext: "diff" },

  "source-map-resolver": { ext: "txt" },
  "cron-to-systemd-timer": { ext: "txt" },
  // ---- text ----------------------------------------------------------------
  "case-converter": C,
  "text-cleaner": C,
  "find-replace-text": C,
  "line-sort-dedupe": C,
  "line-tools": C,
  "list-converter": C,
  "string-escape": C,
  "unicode-normalizer": C,
  "classical-ciphers": C,
  "ansi-escape-stripper": { ...C, accept: ".log,.txt" },
  "email-normalizer": C,
  "markdown-html": { ext: "html", accept: ".md,.markdown,.txt" },
  "markdown-jira-converter": { ...C, accept: ".md,.markdown,.txt" },
  "markdown-table-formatter": { ...C, ext: "md", accept: ".md,.csv,.txt" },
  "markdown-toc-generator": { ext: "md", accept: ".md,.markdown" },
  "changelog-generator": { downloadName: "CHANGELOG.md" },
  "subtitle-converter": { ...C, ext: "srt", accept: ".srt,.vtt" },
  "text-table": C,
  "unified-diff-applier": C,
  "access-log-analyzer": { accept: ".log,.txt" },
  "java-stacktrace-analyzer": { accept: ".log,.txt" },
  "template-bulk-generator": { accept: ".csv,.tsv,.json,.txt" },
  "text-diff": { ext: "diff" },

  "ascii-tree-generator": { ext: "txt" },
  "text-wrap-formatter": { ext: "txt" },
  "merge-conflict-resolver": { ext: "txt" },
  // ---- converters ----------------------------------------------------------
  "morse-code-converter": C,
  "nato-alphabet-converter": C,
  "number-to-words-converter": C,
  "px-rem-converter": { ...C, ext: "css" },

  // ---- security ------------------------------------------------------------
  "aes-encrypt-decrypt": C,
  "pii-masker": { ...C, accept: ".txt,.log,.csv,.json" },
  "htpasswd-generator": { downloadName: ".htpasswd" },
  "rsa-ec-key-pair-generator": { downloadName: "keys.pem" },
  "jwks-inspector": { accept: ".json,.pem,.jwks" },
  "ssh-key-fingerprint": { accept: ".pub,.txt" },
  "aws-iam-policy-analyzer": { accept: ".json" },
  "saml-decoder": { accept: ".xml,.txt" },

  // ---- network -------------------------------------------------------------
  "nginx-config-generator": { downloadName: "nginx.conf" },
  "kong-config-generator": { downloadName: "kong.yaml" },
  "robots-txt-generator": { downloadName: "robots.txt" },
  "sitemap-xml-generator": { downloadName: "sitemap.xml" },
  "apigee-policy-generator": { ext: "xml" },
  "email-header-analyzer": { accept: ".eml,.txt" },
  "dns-zone-record-builder": { ext: "zone" },

  // ---- generators ----------------------------------------------------------
  "dockerfile-generator": { downloadName: "Dockerfile" },
  "docker-compose-generator": { downloadName: "compose.yaml" },
  "kubernetes-manifest-generator": { downloadName: "k8s.yaml" },
  "logback-config-generator": { ext: "yaml" },
  "github-actions-generator": { downloadName: "ci.yml" },
  "editorconfig-generator": { downloadName: ".editorconfig" },
  "license-generator": { downloadName: "LICENSE" },
  "maven-pom-generator": { downloadName: "pom.xml" },
  "security-txt-generator": { downloadName: "security.txt" },
  "systemd-unit-generator": { downloadName: "app.service" },
  "ics-event-generator": { downloadName: "event.ics" },
  "web-app-manifest-generator": { downloadName: "manifest.webmanifest" },
  "spring-config-generator": { ext: "yaml" },
  "badge-generator": { ext: "md" },
  "mock-api-response-generator": { ext: "json" },
  "fake-data-generator": { ext: "json" },

  "ssh-config-generator": { downloadName: "config" },
  // ---- image ---------------------------------------------------------------
  "svg-optimizer": { ...C, ext: "svg", accept: ".svg" },
  "svg-exporter": { accept: ".svg" },
};

export function getToolIo(slug: string | null | undefined): ToolIoConfig {
  return (slug && TOOL_IO[slug]) || {};
}

// ---------------------------------------------------------------------------
// Download naming

const MIME: Record<string, string> = {
  json: "application/json", ndjson: "application/x-ndjson", xml: "application/xml", html: "text/html",
  svg: "image/svg+xml", yaml: "application/yaml", yml: "application/yaml", csv: "text/csv", md: "text/markdown",
  css: "text/css", js: "text/javascript", sql: "application/sql", ics: "text/calendar",
  webmanifest: "application/manifest+json", srt: "application/x-subrip", vtt: "text/vtt",
};

/** Guesses a file extension from output content; null when it can't tell. */
export function sniffExtension(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  if (t.startsWith("WEBVTT")) return "vtt";
  if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
    try {
      JSON.parse(t);
      return "json";
    } catch {
      /* not JSON */
    }
  }
  if (t.startsWith("<")) {
    if (/^<svg[\s>]/i.test(t) || (/^<\?xml/i.test(t) && /<svg[\s>]/i.test(t.slice(0, 500)))) return "svg";
    if (/^<!doctype html|^<html[\s>]/i.test(t)) return "html";
    if (/^<\?xml/i.test(t) || (t.endsWith(">") && /^<[A-Za-z_][\w.:-]*[\s>/]/.test(t))) return "xml";
  }
  if (t.startsWith("BEGIN:VCALENDAR")) return "ics";
  if (t.startsWith("-----BEGIN ")) return "pem";
  return null;
}

/** File name for downloading a tool's output. */
export function downloadFileName(slug: string | null | undefined, text: string, config: ToolIoConfig = getToolIo(slug)): string {
  if (config.downloadName) return config.downloadName;
  const ext = sniffExtension(text) ?? config.ext ?? "txt";
  return `${slug || "output"}.${ext}`;
}

export function mimeForFileName(name: string): string {
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".") + 1).toLowerCase() : "";
  return `${MIME[ext] ?? "text/plain"};charset=utf-8`;
}

/** Markdown fence language for "Copy as Markdown code block". */
export function fenceLanguage(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower === "dockerfile") return "dockerfile";
  if (!lower.includes(".") || lower.startsWith(".") && lower.indexOf(".", 1) === -1) {
    return lower === ".env" ? "dotenv" : "";
  }
  const ext = lower.slice(lower.lastIndexOf(".") + 1);
  const map: Record<string, string> = { yml: "yaml", webmanifest: "json", ndjson: "json", txt: "", log: "", conf: "nginx", service: "ini", sh: "bash", pem: "" };
  return ext in map ? map[ext]! : ext;
}

export function toMarkdownCodeBlock(text: string, lang: string): string {
  const longest = Math.max(2, ...Array.from(text.matchAll(/`+/g), (m) => m[0].length));
  const fence = "`".repeat(longest + 1);
  return `${fence}${lang}\n${text.replace(/\n$/, "")}\n${fence}`;
}

// ---------------------------------------------------------------------------
// Reading files into inputs

/** Hard ceiling for loading a file into a text field; bigger files freeze the page. */
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** True when bytes look like binary data rather than text. */
export function looksBinary(bytes: Uint8Array): boolean {
  const n = Math.min(bytes.length, 8192);
  if (n === 0) return false;
  let control = 0;
  for (let i = 0; i < n; i++) {
    const b = bytes[i]!;
    if (b === 0) return true;
    if (b < 7 || (b > 13 && b < 32 && b !== 27)) control++;
  }
  if (control / n > 0.1) return true;
  const sample = n === bytes.length ? bytes : bytes.subarray(0, charBoundary(bytes, n));
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(sample);
    return false;
  } catch {
    return true;
  }
}

/** Largest end <= n that does not split a UTF-8 sequence. */
function charBoundary(bytes: Uint8Array, n: number): number {
  let i = n;
  // Walk back over continuation bytes (at most 3) to the lead byte.
  while (i > 0 && n - i < 3 && (bytes[i - 1]! & 0xc0) === 0x80) i--;
  const lead = bytes[i - 1];
  if (lead === undefined || lead < 0xc0) return n;
  const need = lead >= 0xf0 ? 4 : lead >= 0xe0 ? 3 : 2;
  return n - (i - 1) >= need ? n : i - 1;
}

export function bytesToSpacedHex(bytes: Uint8Array): string {
  const lines: string[] = [];
  for (let i = 0; i < bytes.length; i += 32) {
    const line: string[] = [];
    for (const b of bytes.subarray(i, i + 32)) line.push(b.toString(16).padStart(2, "0"));
    lines.push(line.join(" "));
  }
  return lines.join("\n");
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

export type FileLoadResult = { ok: true; text: string; note: string } | { ok: false; error: string };

/** Turns file bytes into input text according to the tool's read mode. */
export function decodeFileBytes(name: string, bytes: Uint8Array, mode: FileReadMode = "text"): FileLoadResult {
  if (bytes.length > MAX_FILE_BYTES) {
    return { ok: false, error: `${name} is ${formatBytes(bytes.length)}; files up to ${formatBytes(MAX_FILE_BYTES)} can be loaded into a text field.` };
  }
  const size = formatBytes(bytes.length);
  if (!looksBinary(bytes)) {
    let text = new TextDecoder("utf-8").decode(bytes);
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    return { ok: true, text, note: `Loaded ${name} (${size})` };
  }
  if (mode === "auto-hex") return { ok: true, text: bytesToSpacedHex(bytes), note: `Loaded ${name} (${size}) as hex` };
  if (mode === "auto-base64") return { ok: true, text: bytesToBase64(bytes), note: `Loaded ${name} (${size}) as base64` };
  if (mode === "auto-pem") {
    const b64 = bytesToBase64(bytes).replace(/(.{64})/g, "$1\n").replace(/\n$/, "");
    return { ok: true, text: `-----BEGIN CERTIFICATE-----\n${b64}\n-----END CERTIFICATE-----`, note: `Loaded ${name} (${size}), DER converted to PEM` };
  }
  return { ok: false, error: `${name} looks like a binary file; this tool expects text.` };
}

// ---------------------------------------------------------------------------
// Statistics

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function utf8Length(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
      const d = text.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) {
        n += 4;
        i++;
      } else n += 3;
    } else n += 3;
  }
  return n;
}

export interface TextStats {
  chars: number;
  lines: number;
  words: number;
  bytes: number;
}

/** Characters count Unicode code points, so an emoji is one character. */
export function textStats(text: string): TextStats {
  if (!text) return { chars: 0, lines: 0, words: 0, bytes: 0 };
  let chars = 0;
  let lines = 1;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c === 10) lines++;
    if (c < 0xdc00 || c > 0xdfff) chars++;
  }
  // Word counting allocates; skip it for very large inputs to keep typing smooth.
  const words = text.length > 1_000_000 ? 0 : (text.match(/\S+/g)?.length ?? 0);
  return { chars, lines, words, bytes: utf8Length(text) };
}

export function formatStats(s: TextStats, selected = 0): string {
  const n = (v: number) => v.toLocaleString("en-US");
  const parts = [`${n(s.chars)} ${s.chars === 1 ? "char" : "chars"}`, `${n(s.lines)} ${s.lines === 1 ? "line" : "lines"}`];
  if (s.words) parts.push(`${n(s.words)} ${s.words === 1 ? "word" : "words"}`);
  parts.push(formatBytes(s.bytes));
  if (selected) parts.push(`${n(selected)} selected`);
  return parts.join(" · ");
}
