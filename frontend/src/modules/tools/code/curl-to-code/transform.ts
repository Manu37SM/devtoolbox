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
    const textBlocks = options.javaTextBlocks ?? true;
    const generators: Record<CurlTarget, (c: ParsedCurl) => string> = {
      fetch: generateFetch,
      axios: generateAxios,
      python: generatePython,
      "java-httpclient": (c) => generateJavaHttpClient(c, textBlocks),
      "spring-restclient": (c) => generateSpringRestClient(c, textBlocks),
      "spring-webclient": (c) => generateSpringWebClient(c, textBlocks),
      okhttp: (c) => generateOkHttp(c, textBlocks),
      go: generateGo,
      csharp: generateCSharp,
      powershell: generatePowerShell,
    };
    return { output: generators[options.target](parsed), error: null };
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "Could not parse the cURL command." } };
  }
}

// ---------------------------------------------------------------- shared helpers for the typed languages

function splitAuth(creds: string): [string, string] {
  const colon = creds.indexOf(":");
  return colon === -1 ? [creds, ""] : [creds.slice(0, colon), creds.slice(colon + 1)];
}

/** The body as it should be written: pretty-printed when it is JSON. */
function bodyText(c: ParsedCurl): string | null {
  if (c.body === null) return null;
  const json = isJsonContentType(c) ? tryJson(c.body) : undefined;
  return json !== undefined ? JSON.stringify(json, null, 2) : c.body;
}

function contentType(c: ParsedCurl): string | null {
  return c.headers.find(([n]) => n.toLowerCase() === "content-type")?.[1] ?? null;
}

/** Java string expression for a body: a text block for multi-line text when allowed, else an escaped literal. */
function javaString(text: string, textBlocks: boolean, pad: string): string {
  if (textBlocks && text.includes("\n")) {
    const escaped = text.replace(/\\/g, "\\\\").replace(/"""/g, '\\"""');
    return `"""\n${escaped.split("\n").map((l) => pad + l).join("\n")}\n${pad}"""`;
  }
  return q(text);
}

// Headers java.net.http.HttpClient refuses to let you set (IllegalArgumentException).
const JAVA_RESTRICTED = new Set(["host", "content-length", "connection", "expect", "upgrade"]);

function restrictedNote(skipped: string[], client: string): string {
  if (!skipped.length) return "";
  const list = skipped.join(", ");
  const verb = skipped.length === 1 ? "header is" : "headers are";
  const hostHint = skipped.some((h) => h.toLowerCase() === "host")
    ? "\n// To send a custom Host anyway, start the JVM with -Djdk.httpclient.allowRestrictedHeaders=host."
    : "";
  const one = skipped.length === 1;
  return `// The ${list} ${verb} managed by ${client}, which rejects ${one ? "it" : "them"}, so ${one ? "it was" : "they were"} left out.${hostHint}\n`;
}

export function generateJavaHttpClient(c: ParsedCurl, textBlocks = true): string {
  const imports = ["java.net.URI", "java.net.http.HttpClient", "java.net.http.HttpRequest", "java.net.http.HttpResponse"];
  const lines = [`HttpRequest request = HttpRequest.newBuilder()`, `        .uri(URI.create(${q(c.url)}))`];
  const skipped: string[] = [];
  for (const [n, v] of c.headers) {
    if (JAVA_RESTRICTED.has(n.toLowerCase())) skipped.push(n);
    else lines.push(`        .header(${q(n)}, ${q(v)})`);
  }
  if (c.basicAuth !== null) {
    imports.push("java.nio.charset.StandardCharsets", "java.util.Base64");
    lines.push(`        .header("Authorization", "Basic " + Base64.getEncoder().encodeToString(${q(c.basicAuth)}.getBytes(StandardCharsets.UTF_8)))`);
  }
  const body = bodyText(c);
  const publisher = body === null ? "HttpRequest.BodyPublishers.noBody()" : `HttpRequest.BodyPublishers.ofString(${javaString(body, textBlocks, "            ")})`;
  if (c.method === "GET" && body === null) lines.push("        .GET()");
  else if (c.method === "DELETE" && body === null) lines.push("        .DELETE()");
  else lines.push(`        .method(${q(c.method)}, ${publisher})`);
  lines.push("        .build();");
  const note = restrictedNote(skipped, "HttpClient");
  return `${imports.sort().map((i) => `import ${i};`).join("\n")}

HttpClient client = HttpClient.newHttpClient();
${note}${lines.join("\n")}
HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.statusCode() + " " + response.body());
`;
}

function springChain(c: ParsedCurl, textBlocks: boolean, bodyMethod: string, jdkRestricted: boolean): { lines: string[]; imports: string[]; note: string } {
  const imports = ["org.springframework.http.HttpMethod"];
  const lines = [`        .method(HttpMethod.valueOf(${q(c.method)}))`.replace(/HttpMethod\.valueOf\("(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)"\)/, "HttpMethod.$1"), `        .uri(${q(c.url)})`];
  const skipped: string[] = [];
  for (const [n, v] of c.headers) {
    if (jdkRestricted && JAVA_RESTRICTED.has(n.toLowerCase())) skipped.push(n);
    else lines.push(`        .header(${q(n)}, ${q(v)})`);
  }
  if (c.basicAuth !== null) {
    const [user, pass] = splitAuth(c.basicAuth);
    lines.push(`        .headers(h -> h.setBasicAuth(${q(user)}, ${q(pass)}))`);
  }
  const body = bodyText(c);
  if (body !== null) lines.push(`        .${bodyMethod}(${javaString(body, textBlocks, "            ")})`);
  return { lines, imports, note: restrictedNote(skipped, "RestClient's default JDK request factory") };
}

export function generateSpringRestClient(c: ParsedCurl, textBlocks = true): string {
  const { lines, imports, note } = springChain(c, textBlocks, "body", true);
  imports.push("org.springframework.web.client.RestClient");
  return `${imports.sort().map((i) => `import ${i};`).join("\n")}

RestClient restClient = RestClient.create();
${note}String response = restClient${lines.join("\n").replace(/^ {8}/, "\n        ")}
        .retrieve()
        .body(String.class);
`;
}

export function generateSpringWebClient(c: ParsedCurl, textBlocks = true): string {
  const { lines, imports } = springChain(c, textBlocks, "bodyValue", false);
  imports.push("org.springframework.web.reactive.function.client.WebClient");
  return `${imports.sort().map((i) => `import ${i};`).join("\n")}

WebClient webClient = WebClient.create();
String response = webClient${lines.join("\n").replace(/^ {8}/, "\n        ")}
        .retrieve()
        .bodyToMono(String.class)
        .block(); // in reactive code, return the Mono instead of blocking
`;
}

export function generateOkHttp(c: ParsedCurl, textBlocks = true): string {
  const imports = ["okhttp3.OkHttpClient", "okhttp3.Request", "okhttp3.Response"];
  const out: string[] = ["OkHttpClient client = new OkHttpClient();"];
  const body = bodyText(c);
  if (body !== null) {
    imports.push("okhttp3.MediaType", "okhttp3.RequestBody");
    out.push(`RequestBody body = RequestBody.create(${javaString(body, textBlocks, "    ")}, MediaType.parse(${q(contentType(c) ?? "text/plain")}));`);
  }
  const lines = ["Request request = new Request.Builder()", `        .url(${q(c.url)})`];
  for (const [n, v] of c.headers) if (n.toLowerCase() !== "content-type") lines.push(`        .header(${q(n)}, ${q(v)})`);
  if (c.basicAuth !== null) {
    imports.push("okhttp3.Credentials");
    const [user, pass] = splitAuth(c.basicAuth);
    lines.push(`        .header("Authorization", Credentials.basic(${q(user)}, ${q(pass)}))`);
  }
  if (c.method === "GET" && body === null) lines.push("        .get()");
  else if (c.method === "HEAD") lines.push("        .head()");
  else lines.push(`        .method(${q(c.method)}, ${body === null ? "null" : "body"})`);
  lines.push("        .build();");
  out.push(lines.join("\n"));
  out.push(`try (Response response = client.newCall(request).execute()) {\n    System.out.println(response.code() + " " + response.body().string());\n}`);
  return `${imports.sort().map((i) => `import ${i};`).join("\n")}\n\n${out.join("\n")}\n`;
}

function goString(text: string): string {
  return text.includes("`") ? q(text) : "`" + text + "`";
}

export function generateGo(c: ParsedCurl): string {
  const body = bodyText(c);
  const imports = ["fmt", "io", "net/http", ...(body !== null ? ["strings"] : [])].sort();
  const lines = [
    `\treq, err := http.NewRequest(${q(c.method)}, ${q(c.url)}, ${body === null ? "nil" : `strings.NewReader(${goString(body)})`})`,
    "\tif err != nil {\n\t\tpanic(err)\n\t}",
  ];
  for (const [n, v] of c.headers) {
    // net/http ignores a Host entry in Header; the request's Host field is what gets sent.
    lines.push(n.toLowerCase() === "host" ? `\treq.Host = ${q(v)}` : `\treq.Header.Add(${q(n)}, ${q(v)})`);
  }
  if (c.basicAuth !== null) {
    const [user, pass] = splitAuth(c.basicAuth);
    lines.push(`\treq.SetBasicAuth(${q(user)}, ${q(pass)})`);
  }
  lines.push(
    "\tresp, err := http.DefaultClient.Do(req)",
    "\tif err != nil {\n\t\tpanic(err)\n\t}",
    "\tdefer resp.Body.Close()",
    "\tdata, err := io.ReadAll(resp.Body)",
    "\tif err != nil {\n\t\tpanic(err)\n\t}",
    "\tfmt.Println(resp.Status, string(data))",
  );
  return `package main\n\nimport (\n${imports.map((i) => `\t${q(i)}`).join("\n")}\n)\n\nfunc main() {\n${lines.join("\n")}\n}\n`;
}

function csVerbatim(text: string): string {
  return `@"${text.replace(/"/g, '""')}"`;
}

export function generateCSharp(c: ParsedCurl): string {
  const method = { GET: "Get", POST: "Post", PUT: "Put", PATCH: "Patch", DELETE: "Delete", HEAD: "Head", OPTIONS: "Options" }[c.method];
  const lines = [
    "using var client = new HttpClient();",
    `using var request = new HttpRequestMessage(${method ? `HttpMethod.${method}` : `new HttpMethod(${q(c.method)})`}, ${q(c.url)});`,
  ];
  // Content-Type belongs to the content, not the request; HttpClient throws if it is added as a request header.
  for (const [n, v] of c.headers) if (n.toLowerCase() !== "content-type") lines.push(`request.Headers.TryAddWithoutValidation(${q(n)}, ${q(v)});`);
  const usings = ["System.Text"];
  if (c.basicAuth !== null) {
    usings.push("System.Net.Http.Headers");
    lines.push(`request.Headers.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes(${q(c.basicAuth)})));`);
  }
  const body = bodyText(c);
  if (body !== null) {
    const ct = (contentType(c) ?? "text/plain").split(";")[0]!.trim();
    lines.push(`request.Content = new StringContent(${csVerbatim(body)}, Encoding.UTF8, ${q(ct)});`);
  }
  lines.push("using var response = await client.SendAsync(request);", 'Console.WriteLine($"{(int)response.StatusCode} {await response.Content.ReadAsStringAsync()}");');
  return `${usings.sort().map((u) => `using ${u};`).join("\n")}\n\n${lines.join("\n")}\n`;
}

function psString(text: string): string {
  return `'${text.replace(/'/g, "''")}'`;
}

export function generatePowerShell(c: ParsedCurl): string {
  const out: string[] = [];
  const headers = c.headers.filter(([n]) => n.toLowerCase() !== "content-type");
  const hasAuth = c.basicAuth !== null;
  if (headers.length > 0 || hasAuth) {
    out.push("$headers = @{");
    for (const [n, v] of headers) out.push(`    ${psString(n)} = ${psString(v)}`);
    if (hasAuth) out.push(`    'Authorization' = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(${psString(c.basicAuth!)}))`);
    out.push("}");
  }
  const body = bodyText(c);
  // A here-string keeps the body verbatim; a line starting with '@ would end it early.
  if (body !== null) out.push(/^'@/m.test(body) ? `$body = ${psString(body)}` : `$body = @'\n${body}\n'@`);
  const args = [`-Uri ${psString(c.url)}`, `-Method ${c.method.charAt(0) + c.method.slice(1).toLowerCase()}`];
  if (headers.length > 0 || hasAuth) args.push("-Headers $headers");
  const ct = contentType(c);
  if (ct) args.push(`-ContentType ${psString(ct)}`);
  if (body !== null) args.push("-Body $body");
  out.push(`$response = Invoke-RestMethod ${args.join(" ")}`, "$response");
  return out.join("\n") + "\n";
}

