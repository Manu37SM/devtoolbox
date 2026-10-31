import type { TransformResult } from "@/lib/tool-transform";
import type { ContentDispositionBuilderOptions } from "./schema";

type Opts = ContentDispositionBuilderOptions;

const ATTR_CHAR = /[A-Za-z0-9!#$&+\-.^_`|~]/;

/** RFC 8187 percent-encoding of the UTF-8 bytes of s. */
export function encodeExtValue(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let out = "";
  for (const b of bytes) {
    const c = String.fromCharCode(b);
    out += b < 128 && ATTR_CHAR.test(c) ? c : "%" + b.toString(16).toUpperCase().padStart(2, "0");
  }
  return out;
}

export function quote(s: string): string {
  return '"' + s.replace(/[\\"]/g, "\\$&") + '"';
}

/** ASCII-only rendition of name for the legacy filename= parameter. */
export function asciiFallback(name: string, mode: "transliterate" | "underscore"): string {
  let s = name;
  if (mode === "transliterate") s = s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return Array.from(s)
    .map((c) => {
      const code = c.codePointAt(0)!;
      if (code < 0x20 || code === 0x7f) return "";
      if (code > 0x7e) return "_";
      return c === "%" ? "_" : c;
    })
    .join("");
}

const WIN_RESERVED = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

export interface BuildInfo {
  header: string;
  name: string;
  warnings: string[];
}

export function buildHeader(rawName: string, o: Opts): BuildInfo {
  const warnings: string[] = [];
  let name = rawName;
  if (/[\r\n]/.test(name)) {
    warnings.push("CR/LF removed from the filename (header-injection / response-splitting guard)");
    name = name.replace(/[\r\n]+/g, "");
  }
  if (/[\u0000-\u001f\u007f]/.test(name)) {
    warnings.push("control characters removed");
    name = name.replace(/[\u0000-\u001f\u007f]/g, "");
  }
  if (o.stripPath && /[\\/]/.test(name)) {
    name = name.replace(/^.*[\\/]/, "");
    warnings.push("directory part removed");
  }
  if (o.windowsSafe) {
    const w = name.replace(/[<>:"|?*]/g, "_").replace(/[. ]+$/, "");
    if (w !== name) warnings.push("replaced characters Windows does not allow in file names");
    name = w;
  } else if (/[<>:"|?*]/.test(name)) warnings.push('contains characters Windows rejects in file names (<>:"|?*)');
  if (name === "" && o.disposition !== "inline") warnings.push("empty filename: browsers will pick their own");
  if (WIN_RESERVED.test(name)) warnings.push(`"${name}" is a reserved device name on Windows`);
  if (/^\./.test(name)) warnings.push("leading dot: file is hidden on Unix-like systems");
  if (/[. ]$/.test(name) && !o.windowsSafe) warnings.push("trailing dot/space is stripped by Windows");
  const bytes = new TextEncoder().encode(name).length;
  if (bytes > 255) warnings.push(`${bytes} bytes: longer than the 255-byte limit of most file systems`);

  const nonAscii = /[^\x20-\x7e]/.test(name);
  const parts: string[] = [o.disposition];
  if (o.disposition === "form-data") parts.push(`name=${quote(o.fieldName.replace(/[\r\n]/g, ""))}`);
  if (name !== "") {
    const needExt = o.style === "extended" || (o.style === "both" && (nonAscii || o.alwaysExtended)) || (o.alwaysExtended && o.style !== "ascii");
    const fb = nonAscii ? asciiFallback(name, o.fallback) : name;
    if (o.style !== "extended") parts.push(`filename=${quote(fb)}`);
    if (needExt) parts.push(`filename*=UTF-8''${encodeExtValue(name)}`);
    if (o.style === "ascii" && nonAscii) warnings.push("non-ASCII characters were replaced; some clients show the fallback name");
  }
  return { header: parts.join("; "), name, warnings };
}

export interface Parsed {
  type: string;
  params: Array<{ name: string; value: string; extended: boolean; charset?: string; lang?: string }>;
  filename: string | null;
  source: "filename*" | "filename" | null;
  warnings: string[];
}

function splitSemi(s: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (q && c === "\\") {
      cur += c + (s[i + 1] ?? "");
      i++;
      continue;
    }
    if (c === '"') q = !q;
    if (c === ";" && !q) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

function decodeExt(v: string, warnings: string[]): { value: string; charset: string; lang: string } | null {
  const m = /^([A-Za-z0-9!#$%&+\-^_`{}~]+)'([A-Za-z0-9-]*)'(.*)$/.exec(v);
  if (!m) {
    warnings.push(`filename* value "${v}" is not charset'language'value`);
    return null;
  }
  const charset = m[1]!.toLowerCase();
  const bytes: number[] = [];
  const enc = m[3]!;
  for (let i = 0; i < enc.length; i++) {
    if (enc[i] === "%" && /^[0-9A-Fa-f]{2}$/.test(enc.slice(i + 1, i + 3))) {
      bytes.push(parseInt(enc.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      if (enc.charCodeAt(i) > 0x7e) warnings.push("raw non-ASCII character inside filename*");
      bytes.push(...new TextEncoder().encode(enc[i]!));
    }
  }
  if (charset !== "utf-8" && charset !== "iso-8859-1") warnings.push(`charset ${charset} is not one RFC 8187 recipients must support`);
  try {
    const label = charset === "iso-8859-1" ? "latin1" : charset;
    return { value: new TextDecoder(label, { fatal: true }).decode(new Uint8Array(bytes)), charset, lang: m[2]! };
  } catch {
    warnings.push(`bytes are not valid ${charset}`);
    return null;
  }
}

export function parseHeader(input: string): Parsed {
  let text = input.trim().replace(/^content-disposition\s*:\s*/i, "");
  text = text.replace(/\r?\n[ \t]+/g, " ");
  const warnings: string[] = [];
  const bits = splitSemi(text).map((s) => s.trim());
  const type = (bits[0] ?? "").toLowerCase();
  if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(type)) warnings.push(`"${type}" is not a valid disposition type`);
  else if (!["attachment", "inline", "form-data"].includes(type)) warnings.push(`unusual disposition type "${type}": clients treat unknown types as attachment`);
  const params: Parsed["params"] = [];
  for (const b of bits.slice(1)) {
    if (!b) continue;
    const eq = b.indexOf("=");
    if (eq < 0) {
      warnings.push(`parameter "${b}" has no value`);
      continue;
    }
    let name = b.slice(0, eq).trim().toLowerCase();
    let value = b.slice(eq + 1).trim();
    const quoted = value.startsWith('"');
    if (quoted) {
      if (!value.endsWith('"') || value.length < 2) warnings.push(`unterminated quoted string in ${name}`);
      value = value.slice(1, value.endsWith('"') ? -1 : undefined).replace(/\\(.)/g, "$1");
    } else if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]*$/.test(value)) {
      warnings.push(`${name} should be quoted: its value has characters that are not token characters`);
    }
    if (name.endsWith("*")) {
      name = name.slice(0, -1);
      const d = decodeExt(value, warnings);
      if (d) params.push({ name, value: d.value, extended: true, charset: d.charset, lang: d.lang });
    } else {
      if (quoted && /[^\x20-\x7e]/.test(value) && name === "filename") warnings.push("raw non-ASCII bytes in filename=: interpretation depends on the client; prefer filename*");
      if (name === "filename" && /%[0-9A-Fa-f]{2}/.test(value)) warnings.push("filename= contains %XX: some clients percent-decode it, others do not");
      params.push({ name, value, extended: false });
    }
  }
  const ext = params.find((p) => p.name === "filename" && p.extended);
  const plain = params.find((p) => p.name === "filename" && !p.extended);
  const filename = ext?.value ?? plain?.value ?? null;
  if (filename && /[\\/]/.test(filename)) warnings.push("filename contains a path separator: take only the last segment");
  return { type, params, filename, source: ext ? "filename*" : plain ? "filename" : null, warnings };
}

const jstr = (s: string) => JSON.stringify(s);

export function snippetFor(kind: Opts["snippet"], name: string, o: Opts, header: string): string {
  switch (kind) {
    case "spring": {
      const b = o.disposition === "form-data" ? `ContentDisposition.formData().name(${jstr(o.fieldName)})` : `ContentDisposition.${o.disposition}()`;
      return `headers.setContentDisposition(\n    ${b}\n        .filename(${jstr(name)}, StandardCharsets.UTF_8)\n        .build());`;
    }
    case "servlet":
      return `response.setHeader("Content-Disposition", ${jstr(header)});`;
    case "express":
      return o.disposition === "inline" ? `res.setHeader("Content-Disposition", ${jstr(header)});` : `res.attachment(${jstr(name)}); // sets: ${header}`;
    case "flask":
      return `return send_file(path, as_attachment=${o.disposition === "attachment" ? "True" : "False"}, download_name=${jstr(name)})`;
    case "aspnet":
      return `return File(bytes, "application/octet-stream", ${jstr(name)}); // Content-Disposition: ${header}`;
    default:
      return header;
  }
}

export function contentDispositionBuilder(input: string, options: Partial<Opts> = {}): TransformResult {
  const o: Opts = {
    mode: options.mode ?? "build",
    disposition: options.disposition ?? "attachment",
    fieldName: options.fieldName ?? "file",
    style: options.style ?? "both",
    fallback: options.fallback ?? "transliterate",
    stripPath: options.stripPath ?? true,
    windowsSafe: options.windowsSafe ?? false,
    alwaysExtended: options.alwaysExtended ?? false,
    headerName: options.headerName ?? false,
    snippet: options.snippet ?? "header",
  };
  if (input.trim() === "") return { output: "", error: null };
  if (o.mode === "parse") {
    const p = parseHeader(input);
    const lines = [`Disposition: ${p.type}`];
    for (const prm of p.params) lines.push(`  ${prm.name}${prm.extended ? "*" : ""} = ${JSON.stringify(prm.value)}${prm.extended ? `   (${prm.charset}${prm.lang ? `, lang ${prm.lang}` : ""})` : ""}`);
    lines.push(`Effective filename: ${p.filename === null ? "(none)" : JSON.stringify(p.filename)}${p.source ? `   from ${p.source}` : ""}`);
    for (const w of p.warnings) lines.push(`warning: ${w}`);
    return { output: lines.join("\n"), error: null };
  }
  const names = input.split(/\r?\n/).filter((l) => l !== "");
  const out: string[] = [];
  for (const raw of names) {
    const b = buildHeader(raw, o);
    const header = `${o.headerName ? "Content-Disposition: " : ""}${b.header}`;
    out.push(snippetFor(o.snippet, b.name, o, o.snippet === "header" ? header : b.header));
    for (const w of b.warnings) out.push(`// warning: ${w}`);
    if (names.length > 1) out.push("");
  }
  return { output: out.join("\n").trimEnd(), error: null };
}
