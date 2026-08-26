

export interface SmartDetection {
  toolSlug: string;
  reason: string;
}

const DETECTORS: Array<{ test: (s: string) => boolean; toolSlug: string; reason: string }> = [
  {
    test: (s) => /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(s.trim()),
    toolSlug: "jwt-decoder",
    reason: "This looks like a JWT",
  },
  {
    test: (s) => /^#?[0-9a-fA-F]{3}$|^#?[0-9a-fA-F]{6}$/.test(s.trim()),
    toolSlug: "color-converter",
    reason: "This looks like a hex color",
  },
  {
    test: (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim()),
    toolSlug: "uuid-generator",
    reason: "This looks like a UUID",
  },
  {
    test: (s) => /^\d{10}$|^\d{13}$/.test(s.trim()),
    toolSlug: "unix-timestamp",
    reason: "This looks like a Unix timestamp",
  },
  {
    test: (s) => {
      const t = s.trim();
      return t.length > 0 && (t.startsWith("{") || t.startsWith("[")) && isParseableJson(t);
    },
    toolSlug: "json-formatter",
    reason: "This looks like JSON",
  },
  {
    test: (s) => /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/.test(s.trim()),
    toolSlug: "cidr-subnet-calculator",
    reason: "This looks like CIDR notation",
  },
  {

    test: (s) => !s.includes("\n") && !/\s/.test(s.trim()) && /^https?:\/\/[^\s]+\.[^\s]+/.test(s.trim()),
    toolSlug: "url-parser",
    reason: "This looks like a URL",
  },
  {
    test: (s) => {
      const t = s.trim();
      if (t.includes("\n")) return false;
      const fields = t.split(/\s+/);
      if (fields.length < 5 || fields.length > 6) return false;
      return fields.every((f) => /^[\d*,/-]+$/.test(f));
    },
    toolSlug: "cron-builder",
    reason: "This looks like a cron expression",
  },
  {
    test: (s) => /^\s*(SELECT|INSERT\s+INTO|UPDATE|DELETE\s+FROM|CREATE\s+TABLE)\b/i.test(s),
    toolSlug: "sql-formatter",
    reason: "This looks like a SQL statement",
  },
  {
    test: (s) => /Mozilla\/\d\.\d\s*\(/.test(s.trim()) && s.trim().length < 500,
    toolSlug: "user-agent-parser",
    reason: "This looks like a User-Agent string",
  },
  {
    test: (s) => {
      const lines = s
        .trim()
        .split(/\r\n|\r|\n/)
        .filter((l) => l.trim().length > 0);
      if (lines.length === 0) return false;
      return lines.every((l) => /^\s*(export\s+)?[A-Za-z_][A-Za-z0-9_]*=/.test(l) || l.trim().startsWith("#"));
    },
    toolSlug: "dotenv-formatter",
    reason: "This looks like .env file content",
  },
  {
    test: (s) => /^\s*<\?xml[\s\S]*\?>/.test(s) || /^\s*<([a-zA-Z][\w:-]*)[\s\S]*<\/\1>\s*$/.test(s.trim()),
    toolSlug: "xml-formatter",
    reason: "This looks like XML",
  },
  {
    test: (s) => {
      const t = s.trim();
      if (t.length === 0 || t.startsWith("{") || t.startsWith("[") || t.startsWith("<")) return false;
      const lines = t.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0 && !l.trim().startsWith("#"));
      if (lines.length < 2) return false;
      const keyValueLines = lines.filter((l) => /^\s*[\w.-]+:\s?.*$/.test(l) || /^\s*-\s+\S/.test(l));
      return keyValueLines.length === lines.length && !isParseableJson(t);
    },
    toolSlug: "yaml-formatter",
    reason: "This looks like YAML",
  },
  {
    test: (s) => {
      const t = s.trim();
      const lines = t.split(/\r\n|\r|\n/).filter((l) => l.length > 0);
      if (lines.length < 2) return false;
      const countDelims = (line: string, delim: string) => line.split(delim).length - 1;
      for (const delim of [",", "\t"]) {
        const counts = lines.map((l) => countDelims(l, delim));
        if (counts[0]! > 0 && counts.every((c) => c === counts[0])) return true;
      }
      return false;
    },
    toolSlug: "csv-tsv",
    reason: "This looks like CSV/TSV data",
  },
  {
    test: (s) => /^[0-9a-fA-F]{32}$|^[0-9a-fA-F]{40}$|^[0-9a-fA-F]{64}$|^[0-9a-fA-F]{128}$/.test(s.trim()),
    toolSlug: "hash-generator",
    reason: "This looks like a hash digest",
  },
  {
    test: (s) => {
      const t = s.trim().replace(/\s+/g, "");
      return /^[0-9a-fA-F]+$/.test(t) && t.length >= 8 && t.length % 2 === 0;
    },
    toolSlug: "hex-text",
    reason: "This looks like hex-encoded data",
  },
  {
    test: (s) => /^[A-Za-z0-9+/]+={0,2}$/.test(s.trim()) && s.trim().length > 8 && s.trim().length % 4 === 0,
    toolSlug: "base64",
    reason: "This looks like Base64",
  },
];

function isParseableJson(input: string): boolean {
  try {
    JSON.parse(input);
    return true;
  } catch {
    return false;
  }
}

export function detectToolForContent(input: string): SmartDetection | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  for (const detector of DETECTORS) {
    if (detector.test(trimmed)) {
      return { toolSlug: detector.toolSlug, reason: detector.reason };
    }
  }
  return null;
}
