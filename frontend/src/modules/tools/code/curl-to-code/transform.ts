import type { TransformResult } from "@/lib/tool-transform";
import { tokenize } from "@/lib/shell-tokenize";
import type { CurlTarget, CurlToCodeOptions } from "./schema";

export interface ParsedCurl {
  url: string;
  method: string;
  headers: [string, string][];
  body: string | null;
  basicAuth: string | null;
}

export { tokenize };

// Flags that consume the next token. Anything else starting with "-" is treated as a boolean flag.
const VALUE_FLAGS = new Set([
  "-X", "--request", "-H", "--header", "-d", "--data", "--data-raw", "--data-binary", "--data-ascii",
  "--data-urlencode", "-u", "--user", "-A", "--user-agent", "-e", "--referer", "-b", "--cookie", "--url",
  "-F", "--form", "-o", "--output", "-m", "--max-time", "--connect-timeout", "-x", "--proxy", "-w", "--write-out",
  "--json", "--cacert", "--cert", "--key", "-T", "--upload-file", "--retry",
]);

export function parseCurl(command: string): ParsedCurl {
  const tokens = tokenize(command.trim());
  if (tokens.length === 0 || tokens[0]!.toLowerCase() !== "curl") {
    throw new Error("The command must start with “curl”.");
  }

  let url: string | null = null;
  let method: string | null = null;
  let useGet = false;
  let head = false;
  const headers: [string, string][] = [];
  const dataParts: string[] = [];
  let jsonShortcut = false;
  let basicAuth: string | null = null;

  const setHeader = (name: string, value: string) => {
    const idx = headers.findIndex(([n]) => n.toLowerCase() === name.toLowerCase());
    if (idx === -1) headers.push([name, value]);
    else headers[idx] = [name, value];
  };

  for (let i = 1; i < tokens.length; i++) {
    let flag = tokens[i]!;
    let inlineValue: string | undefined;

    if (flag.startsWith("--") && flag.includes("=")) {
      const eq = flag.indexOf("=");
      inlineValue = flag.slice(eq + 1);
      flag = flag.slice(0, eq);
    } else if (/^-[A-Za-z]./.test(flag) && !flag.startsWith("--")) {
      // "-XPOST" or bundled booleans like "-sSL". A value flag in first position takes the rest as its value.
      if (VALUE_FLAGS.has(flag.slice(0, 2))) {
        inlineValue = flag.slice(2);
        flag = flag.slice(0, 2);
      } else {
        for (const c of flag.slice(1)) {
          if (c === "G") useGet = true;
          if (c === "I") head = true;
        }
        continue;
      }
    }

    if (!flag.startsWith("-")) {
      if (url !== null) throw new Error("Multiple URLs are not supported.");
      url = flag;
      continue;
    }

    if (!VALUE_FLAGS.has(flag)) {
      if (flag === "-G" || flag === "--get") useGet = true;
      if (flag === "-I" || flag === "--head") head = true;
      continue;
    }

    const value = inlineValue ?? tokens[++i];
    if (value === undefined) throw new Error(`Flag ${flag} expects a value.`);

    switch (flag) {
      case "-X":
      case "--request":
        method = value.toUpperCase();
        break;
      case "-H":
      case "--header": {
        const colon = value.indexOf(":");
        if (colon === -1) throw new Error(`Invalid header "${value}" — expected "Name: value".`);
        setHeader(value.slice(0, colon).trim(), value.slice(colon + 1).trim());
        break;
      }
      case "-d":
      case "--data":
      case "--data-raw":
      case "--data-binary":
      case "--data-ascii":
        dataParts.push(value);
        break;
      case "--data-urlencode": {
        const eq = value.indexOf("=");
        dataParts.push(eq === -1 ? encodeURIComponent(value) : `${value.slice(0, eq)}=${encodeURIComponent(value.slice(eq + 1))}`);
        break;
      }
      case "--json":
        dataParts.push(value);
        jsonShortcut = true;
        break;
      case "-u":
      case "--user":
        basicAuth = value;
        break;
      case "-A":
      case "--user-agent":
        setHeader("User-Agent", value);
        break;
      case "-e":
      case "--referer":
        setHeader("Referer", value);
        break;
      case "-b":
      case "--cookie":
        setHeader("Cookie", value);
        break;
      case "--url":
        url = value;
        break;
      case "-F":
      case "--form":
      case "-T":
      case "--upload-file":
        throw new Error("Multipart forms and file uploads (-F / -T) aren’t supported yet — they need a file or FormData handle.");
      default:
        break; // flags whose value we deliberately ignore (-o, -m, -x, …)
    }
  }

  if (url === null) throw new Error("No URL found in the cURL command.");
  if (jsonShortcut) {
    if (!headers.some(([n]) => n.toLowerCase() === "content-type")) headers.push(["Content-Type", "application/json"]);
    if (!headers.some(([n]) => n.toLowerCase() === "accept")) headers.push(["Accept", "application/json"]);
  }

  let body: string | null = dataParts.length > 0 ? dataParts.join(jsonShortcut ? "" : "&") : null;
  if (body !== null && useGet) {
    url += (url.includes("?") ? "&" : "?") + body;
    body = null;
  }
  if (body !== null && !headers.some(([n]) => n.toLowerCase() === "content-type")) {
    headers.push(["Content-Type", "application/x-www-form-urlencoded"]);
  }

  const resolvedMethod = method ?? (head ? "HEAD" : body !== null ? "POST" : "GET");
  return { url, method: resolvedMethod, headers, body, basicAuth };
}

const q = (s: string) => JSON.stringify(s);
const indent = (text: string, spaces: number) => text.replace(/\n/g, `\n${" ".repeat(spaces)}`);

function tryJson(body: string): unknown | undefined {
  try {
    const parsed: unknown = JSON.parse(body);
    return typeof parsed === "object" && parsed !== null ? parsed : undefined;
  } catch {
    return undefined;
  }
}

const isJsonContentType = (c: ParsedCurl) =>
  c.headers.some(([n, v]) => n.toLowerCase() === "content-type" && /json/i.test(v));

function headersWithAuth(c: ParsedCurl, authExpr: (creds: string) => string): [string, string, boolean][] {
  const out: [string, string, boolean][] = c.headers.map(([n, v]) => [n, v, false]);
  if (c.basicAuth !== null) out.push(["Authorization", authExpr(c.basicAuth), true]);
  return out;
}

export function generateFetch(c: ParsedCurl): string {
  const headers = headersWithAuth(c, (creds) => `"Basic " + btoa(${q(creds)})`);
  const lines: string[] = [];
  if (c.method !== "GET") lines.push(`  method: ${q(c.method)},`);
  if (headers.length > 0) {
    lines.push("  headers: {");
    for (const [n, v, raw] of headers) lines.push(`    ${q(n)}: ${raw ? v : q(v)},`);
    lines.push("  },");
  }
  if (c.body !== null) {
    const json = isJsonContentType(c) ? tryJson(c.body) : undefined;
    lines.push(json !== undefined ? `  body: JSON.stringify(${indent(JSON.stringify(json, null, 2), 2)}),` : `  body: ${q(c.body)},`);
  }
  const options = lines.length > 0 ? `, {\n${lines.join("\n")}\n}` : "";
  return `const response = await fetch(${q(c.url)}${options});\nconst data = await response.text();\n`;
}

export function generateAxios(c: ParsedCurl): string {
  const headers = headersWithAuth(c, (creds) => `"Basic " + btoa(${q(creds)})`);
  const lines = [`  method: ${q(c.method.toLowerCase())},`, `  url: ${q(c.url)},`];
  if (headers.length > 0) {
    lines.push("  headers: {");
    for (const [n, v, raw] of headers) lines.push(`    ${q(n)}: ${raw ? v : q(v)},`);
    lines.push("  },");
  }
  if (c.body !== null) {
    const json = isJsonContentType(c) ? tryJson(c.body) : undefined;
    lines.push(json !== undefined ? `  data: ${indent(JSON.stringify(json, null, 2), 2)},` : `  data: ${q(c.body)},`);
  }
  return `import axios from "axios";\n\nconst response = await axios({\n${lines.join("\n")}\n});\nconst data = response.data;\n`;
}

function pyLiteral(value: unknown, level = 0): string {
  const pad = "    ".repeat(level + 1);
  const closePad = "    ".repeat(level);
  if (value === null) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value); // JSON string escapes are valid Python
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((v) => pad + pyLiteral(v, level + 1)).join(",\n")},\n${closePad}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return "{}";
  return `{\n${entries.map(([k, v]) => `${pad}${JSON.stringify(k)}: ${pyLiteral(v, level + 1)}`).join(",\n")},\n${closePad}}`;
}

export function generatePython(c: ParsedCurl): string {
  const args = [`${q(c.method)}`, q(c.url)];
  const lines: string[] = [];
  if (c.headers.length > 0) {
    lines.push(`    headers={\n${c.headers.map(([n, v]) => `        ${q(n)}: ${q(v)},`).join("\n")}\n    },`);
  }
  if (c.basicAuth !== null) {
    const colon = c.basicAuth.indexOf(":");
    const user = colon === -1 ? c.basicAuth : c.basicAuth.slice(0, colon);
    const pass = colon === -1 ? "" : c.basicAuth.slice(colon + 1);
    lines.push(`    auth=(${q(user)}, ${q(pass)}),`);
  }
  if (c.body !== null) {
    const json = isJsonContentType(c) ? tryJson(c.body) : undefined;
    lines.push(json !== undefined ? `    json=${indent(pyLiteral(json), 4)},` : `    data=${q(c.body)},`);
  }
  const call = `requests.request(${args.join(", ")}${lines.length > 0 ? `,\n${lines.join("\n")}\n` : ""})`;
  return `import requests\n\nresponse = ${call}\nprint(response.text)\n`;
}

export function convertCurl(input: string, options: CurlToCodeOptions): TransformResult {
  if (input.trim().length === 0) return { output: "", error: null };
  try {
    const parsed = parseCurl(input);
    const generators: Record<CurlTarget, (c: ParsedCurl) => string> = {
      fetch: generateFetch,
      axios: generateAxios,
      python: generatePython,
    };
    return { output: generators[options.target](parsed), error: null };
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "Could not parse the cURL command." } };
  }
}
