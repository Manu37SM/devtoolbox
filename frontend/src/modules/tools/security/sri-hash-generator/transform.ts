import { KJUR, hextob64 } from "jsrsasign";
import type { TransformResult } from "@/lib/tool-transform";
import type { SriHashGeneratorOptions } from "./schema";

type Alg = "sha256" | "sha384" | "sha512";
const ALGS: Alg[] = ["sha256", "sha384", "sha512"];

const toHex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

export function digestB64(bytes: Uint8Array, alg: Alg): string {
  const md = new KJUR.crypto.MessageDigest({ alg, prov: "cryptojs" });
  md.updateHex(toHex(bytes));
  return hextob64(md.digest());
}

export function readBytes(input: string, kind: "text" | "hex" | "base64", eol: "keep" | "lf" | "crlf"): Uint8Array {
  if (kind === "text") {
    let t = input;
    if (eol === "lf") t = t.replace(/\r\n?/g, "\n");
    else if (eol === "crlf") t = t.replace(/\r\n?|\n/g, "\r\n");
    return new TextEncoder().encode(t);
  }
  if (kind === "hex") {
    const h = input.replace(/0x/gi, "").replace(/[\s,:]/g, "");
    if (h.length % 2 !== 0 || !/^[0-9a-fA-F]*$/.test(h)) throw new Error("Hex input must be an even number of hex digits");
    return Uint8Array.from(h.match(/../g) ?? [], (x) => parseInt(x, 16));
  }
  const b = input.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b) || b.length % 4 === 1) throw new Error("Input is not valid base64");
  const bin = atob(b);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export function integrityFor(bytes: Uint8Array, algs: Alg[]): string[] {
  return algs.map((a) => `${a}-${digestB64(bytes, a)}`);
}

/** Parse an integrity attribute value into token list; returns invalid tokens separately. */
export function parseIntegrity(v: string): { valid: Array<{ alg: Alg; hash: string }>; invalid: string[] } {
  const valid: Array<{ alg: Alg; hash: string }> = [];
  const invalid: string[] = [];
  for (const tok of v.trim().split(/\s+/).filter(Boolean)) {
    const [main] = tok.split("?"); // options after ? are ignored by the spec
    const m = /^(sha256|sha384|sha512)-([A-Za-z0-9+/_-]+={0,2})$/.exec(main!);
    if (m) valid.push({ alg: m[1] as Alg, hash: m[2]!.replace(/-/g, "+").replace(/_/g, "/").replace(/=+$/, "") });
    else invalid.push(tok);
  }
  return { valid, invalid };
}

export function sriHashGenerator(input: string, options: Partial<SriHashGeneratorOptions> = {}): TransformResult {
  const action = options.action ?? "generate";
  const picked = (options.algorithms ?? ["sha384"]).filter((a): a is Alg => ALGS.includes(a as Alg));
  const algs: Alg[] = picked.length ? ALGS.filter((a) => picked.includes(a)) : ["sha384"];
  const kind = options.inputKind ?? "text";
  const eol = options.lineEndings ?? "keep";
  const format = options.format ?? "integrity";
  const url = (options.url ?? "").trim() || "https://cdn.example.com/lib.min.js";
  const co = options.crossorigin ?? "anonymous";
  if (input === "" && kind !== "text") return { output: "", error: null };
  try {
    const bytes = readBytes(input, kind, eol);
    if (action === "verify") {
      const { valid, invalid } = parseIntegrity(options.expected ?? "");
      if (valid.length === 0 && invalid.length === 0) return { output: "", error: { message: "Paste the integrity attribute value to verify in the Expected field" } };
      const lines: string[] = [`${bytes.length} bytes hashed`];
      let ok = false;
      const strongest = valid.length ? [...valid].sort((a, b) => ALGS.indexOf(b.alg) - ALGS.indexOf(a.alg))[0]!.alg : null;
      for (const v of valid) {
        const got = digestB64(bytes, v.alg).replace(/=+$/, "");
        const match = got === v.hash;
        // browsers only check the strongest algorithm present
        const checked = v.alg === strongest;
        if (match && checked) ok = true;
        lines.push(`${match ? "MATCH   " : "MISMATCH"} ${v.alg}${checked ? "" : "  (ignored by browsers: a stronger hash is present)"}${match ? "" : `\n         expected ${v.hash}\n         actual   ${got}`}`);
      }
      for (const i of invalid) lines.push(`IGNORED  ${i}  (not sha256/384/512-base64; browsers skip it)`);
      lines.push("", ok ? "Browser would ACCEPT this resource." : "Browser would BLOCK this resource.");
      if (!ok && eol === "keep" && /\r\n/.test(input) === false && kind === "text") lines.push("Hint: the served file may use different line endings, or the CDN may have minified or compressed it differently.");
      return { output: lines.join("\n"), error: null };
    }
    if (bytes.length === 0 && kind === "text" && input === "") return { output: "", error: null };
    const tokens = integrityFor(bytes, algs);
    const value = tokens.join(" ");
    const crossAttr = co === "none" ? "" : ` crossorigin="${co}"`;
    let out: string;
    switch (format) {
      case "script":
        out = `<script src="${url}" integrity="${value}"${crossAttr}></script>`;
        break;
      case "link":
        out = `<link rel="stylesheet" href="${url}" integrity="${value}"${crossAttr}>`;
        break;
      case "csp":
        out = tokens.map((t) => `'${t}'`).join(" ");
        break;
      case "json":
        out = JSON.stringify({ bytes: bytes.length, integrity: value, hashes: Object.fromEntries(algs.map((a, i) => [a, tokens[i]!.slice(a.length + 1)])) }, null, 2);
        break;
      default:
        out = value;
    }
    if (options.trailingNewline) out += "\n";
    return { output: out, error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
