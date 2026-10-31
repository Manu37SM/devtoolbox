import type { TransformResult } from "@/lib/tool-transform";
import type { MimeEncodedWordOptions } from "./schema";

const HEX = "0123456789ABCDEF";
const hex2 = (n: number) => HEX[n >> 4]! + HEX[n & 15]!;

function normCharset(cs: string): string {
  const c = cs.trim().toLowerCase();
  if (c === "latin1" || c === "latin-1" || c === "iso8859-1") return "iso-8859-1";
  if (c === "utf8") return "utf-8";
  return c || "utf-8";
}

/** Text → bytes in the requested charset (utf-8, iso-8859-1 and us-ascii can be produced). */
function encodeText(text: string, charset: string): Uint8Array {
  if (charset === "utf-8") return new TextEncoder().encode(text);
  if (charset === "iso-8859-1" || charset === "us-ascii") {
    const max = charset === "us-ascii" ? 0x7f : 0xff;
    const out: number[] = [];
    for (const ch of text) {
      const cp = ch.codePointAt(0)!;
      if (cp > max) throw new Error(`"${ch}" cannot be represented in ${charset}. Use utf-8.`);
      out.push(cp);
    }
    return Uint8Array.from(out);
  }
  throw new Error(`Encoding to "${charset}" is not supported. Use utf-8, iso-8859-1 or us-ascii.`);
}

function decodeBytes(bytes: Uint8Array, charset: string): string {
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    throw new Error(`Unknown character set "${charset}".`);
  }
}

/* ---------------- quoted-printable (RFC 2045 §6.7) ---------------- */

export function qpEncode(bytes: Uint8Array, lineLength: number, eol: string, encodeAll: boolean): string {
  // Split into logical lines on CRLF / LF; every other byte is encoded as needed.
  const lines: number[][] = [[]];
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i]!;
    if (b === 10 || (b === 13 && bytes[i + 1] === 10)) {
      if (b === 13) i++;
      lines.push([]);
    } else lines[lines.length - 1]!.push(b);
  }
  const out: string[] = [];
  for (const line of lines) {
    const tokens: string[] = [];
    line.forEach((b, i) => {
      const last = i === line.length - 1;
      const plain = encodeAll ? /[A-Za-z0-9]/.test(String.fromCharCode(b)) : (b >= 33 && b <= 126 && b !== 61) ;
      const ws = b === 32 || b === 9;
      if (plain || (ws && !last && !encodeAll)) tokens.push(String.fromCharCode(b));
      else tokens.push(`=${hex2(b)}`);
    });
    if (lineLength <= 0) {
      out.push(tokens.join(""));
      continue;
    }
    let cur = "";
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]!;
      // Reserve one column for the soft-break "=" unless this is the last token on the line.
      const limit = i === tokens.length - 1 ? lineLength : lineLength - 1;
      if (cur.length + t.length > limit) {
        out.push(`${cur}=`);
        cur = "";
      }
      cur += t;
    }
    out.push(cur);
  }
  return out.join(eol);
}

export function qpDecode(text: string): Uint8Array {
  const out: number[] = [];
  const s = text.replace(/[ \t]+(?=\r?\n|$)/g, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === "=") {
      if (s[i + 1] === "\n") { i += 1; continue; }
      if (s[i + 1] === "\r" && s[i + 2] === "\n") { i += 2; continue; }
      const h = s.slice(i + 1, i + 3);
      if (/^[0-9A-Fa-f]{2}$/.test(h)) { out.push(parseInt(h, 16)); i += 2; continue; }
    }
    const cp = s.codePointAt(i)!;
    if (cp < 0x80) out.push(cp);
    else {
      for (const b of new TextEncoder().encode(String.fromCodePoint(cp))) out.push(b);
      if (cp > 0xffff) i++;
    }
  }
  return Uint8Array.from(out);
}

/* ---------------- RFC 2047 encoded words ---------------- */

const Q_SAFE = /[A-Za-z0-9!*+\-/]/;
const qWord = (b: Uint8Array) => Array.from(b, (x) => (x === 32 ? "_" : Q_SAFE.test(String.fromCharCode(x)) ? String.fromCharCode(x) : `=${hex2(x)}`)).join("");
const bWord = (b: Uint8Array) => {
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
};

/** Split text into chunks of whole characters whose encoded form fits `max` characters. */
function chunkWords(text: string, charset: string, enc: "Q" | "B"): string[] {
  const prefix = `=?${charset}?${enc}?`;
  const max = 75 - prefix.length - 2;
  const chars = [...text];
  const words: string[] = [];
  let cur: string[] = [];
  const size = (cs: string[]) => {
    const b = encodeText(cs.join(""), charset);
    return enc === "Q" ? qWord(b).length : Math.ceil(b.length / 3) * 4;
  };
  for (const ch of chars) {
    if (cur.length && size([...cur, ch]) > max) {
      words.push(cur.join(""));
      cur = [];
    }
    cur.push(ch);
  }
  if (cur.length) words.push(cur.join(""));
  return words.map((w) => {
    const b = encodeText(w, charset);
    return `${prefix}${enc === "Q" ? qWord(b) : bWord(b)}?=`;
  });
}

export function encodeWords(text: string, charset: string, enc: "auto" | "Q" | "B", force: boolean, sep: string): string {
  // Only the run of words containing non-ASCII needs encoding; keep it simple and safe: encode the whole value.
  if (!force && /^[\x00-\x7f]*$/.test(text)) return text;
  let e: "Q" | "B" = enc === "auto" ? "Q" : enc;
  if (enc === "auto") {
    const b = encodeText(text, charset);
    e = qWord(b).length <= Math.ceil(b.length / 3) * 4 ? "Q" : "B";
  }
  return chunkWords(text, charset, e).join(sep);
}

const WORD_RE = /=\?([^?\s]+?)(?:\*[^?\s]*)?\?([QqBb])\?([^?\s]*)\?=/g;

export function decodeWords(text: string): string {
  // Whitespace between two adjacent encoded words is ignored (RFC 2047 §6.2).
  const collapsed = text.replace(/(\?=)[ \t]*\r?\n?[ \t]+(?==\?[^?\s]+\?[QqBb]\?)/g, "$1");
  return collapsed.replace(WORD_RE, (_m, cs: string, enc: string, payload: string) => {
    let bytes: Uint8Array;
    if (enc.toUpperCase() === "B") {
      const bin = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "="));
      bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    } else {
      bytes = qpDecode(payload.replace(/_/g, " "));
    }
    return decodeBytes(bytes, normCharset(cs));
  });
}

export function mimeEncodedWord(input: string, options: Partial<MimeEncodedWordOptions>): TransformResult {
  const o: MimeEncodedWordOptions = {
    mode: options.mode ?? "word-encode",
    charset: options.charset ?? "utf-8",
    wordEncoding: options.wordEncoding ?? "auto",
    forceEncode: options.forceEncode ?? false,
    wordSeparator: options.wordSeparator ?? "space",
    lineLength: options.lineLength ?? 76,
    eol: options.eol ?? "lf",
    encodeAll: options.encodeAll ?? false,
  };
  if (!input) return { output: "", error: null };
  const cs = normCharset(o.charset);
  const eol = o.eol === "crlf" ? "\r\n" : "\n";
  try {
    switch (o.mode) {
      case "qp-encode":
        return { output: qpEncode(encodeText(input, cs), o.lineLength, eol, o.encodeAll), error: null };
      case "qp-decode":
        return { output: decodeBytes(qpDecode(input), cs), error: null };
      case "word-encode": {
        const sep = o.wordSeparator === "fold" ? `${eol} ` : " ";
        return { output: input.split(/\r?\n/).map((l) => encodeWords(l, cs, o.wordEncoding, o.forceEncode, sep)).join(eol), error: null };
      }
      case "word-decode":
        return { output: decodeWords(input), error: null };
    }
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
