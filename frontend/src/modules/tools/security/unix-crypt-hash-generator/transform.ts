import { KJUR } from "jsrsasign";
import type { TransformResult } from "@/lib/tool-transform";
import type { UnixCryptHashGeneratorOptions } from "./schema";

const ITOA64 = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
type Bytes = number[];

const toHex = (b: Bytes) => b.map((x) => x.toString(16).padStart(2, "0")).join("");
const fromHex = (h: string): Bytes => (h.match(/../g) ?? []).map((x) => parseInt(x, 16));
function digest(alg: "md5" | "sha256" | "sha512", data: Bytes): Bytes {
  const md = new KJUR.crypto.MessageDigest({ alg, prov: "cryptojs" });
  md.updateHex(toHex(data));
  return fromHex(md.digest());
}
const cat = (...parts: Bytes[]): Bytes => ([] as Bytes).concat(...parts);
const repeatTo = (b: Bytes, n: number): Bytes => {
  const out: Bytes = [];
  while (out.length < n) out.push(...b.slice(0, n - out.length));
  return out;
};
const utf8 = (s: string): Bytes => Array.from(new TextEncoder().encode(s));
const b64 = (a: number, b: number, c: number, n: number) => {
  let w = (a << 16) | (b << 8) | c;
  let s = "";
  for (let i = 0; i < n; i++) { s += ITOA64[w & 63]; w >>= 6; }
  return s;
};

export function md5Crypt(pw: Bytes, salt: string): string {
  const s = utf8(salt);
  const magic = utf8("$1$");
  const alt = digest("md5", cat(pw, s, pw));
  let ctx = cat(pw, magic, s);
  for (let pl = pw.length; pl > 0; pl -= 16) ctx = cat(ctx, alt.slice(0, Math.min(16, pl)));
  for (let i = pw.length; i; i >>= 1) ctx = cat(ctx, i & 1 ? [0] : pw.slice(0, 1));
  let fin = digest("md5", ctx);
  for (let i = 0; i < 1000; i++) {
    let c: Bytes = i & 1 ? pw : fin;
    if (i % 3) c = cat(c, s);
    if (i % 7) c = cat(c, pw);
    c = cat(c, i & 1 ? fin : pw);
    fin = digest("md5", c);
  }
  const f = fin;
  return "$1$" + salt + "$" + b64(f[0]!, f[6]!, f[12]!, 4) + b64(f[1]!, f[7]!, f[13]!, 4) + b64(f[2]!, f[8]!, f[14]!, 4) + b64(f[3]!, f[9]!, f[15]!, 4) + b64(f[4]!, f[10]!, f[5]!, 4) + b64(0, 0, f[11]!, 2);
}

const ORDER_256: [number, number, number][] = [[0, 10, 20], [21, 1, 11], [12, 22, 2], [3, 13, 23], [24, 4, 14], [15, 25, 5], [6, 16, 26], [27, 7, 17], [18, 28, 8], [9, 19, 29]];
const ORDER_512: [number, number, number][] = [[0, 21, 42], [22, 43, 1], [44, 2, 23], [3, 24, 45], [25, 46, 4], [47, 5, 26], [6, 27, 48], [28, 49, 7], [50, 8, 29], [9, 30, 51], [31, 52, 10], [53, 11, 32], [12, 33, 54], [34, 55, 13], [56, 14, 35], [15, 36, 57], [37, 58, 16], [59, 17, 38], [18, 39, 60], [40, 61, 19], [62, 20, 41]];

export function shaCrypt(alg: "sha256" | "sha512", pw: Bytes, saltStr: string, rounds: number, explicitRounds: boolean): string {
  const salt = utf8(saltStr);
  const n = alg === "sha256" ? 32 : 64;
  const B = digest(alg, cat(pw, salt, pw));
  let ctx = cat(pw, salt);
  for (let cnt = pw.length; cnt > 0; cnt -= n) ctx = cat(ctx, B.slice(0, Math.min(n, cnt)));
  for (let cnt = pw.length; cnt > 0; cnt >>= 1) ctx = cat(ctx, cnt & 1 ? B : pw);
  let A = digest(alg, ctx);
  let dp: Bytes = [];
  for (let i = 0; i < pw.length; i++) dp = cat(dp, pw);
  const P = repeatTo(digest(alg, dp), pw.length);
  let ds: Bytes = [];
  for (let i = 0; i < 16 + A[0]!; i++) ds = cat(ds, salt);
  const S = repeatTo(digest(alg, ds), salt.length);
  for (let i = 0; i < rounds; i++) {
    let c: Bytes = i & 1 ? P : A;
    if (i % 3) c = cat(c, S);
    if (i % 7) c = cat(c, P);
    c = cat(c, i & 1 ? A : P);
    A = digest(alg, c);
  }
  let out = "";
  if (alg === "sha256") {
    for (const [a, b, c] of ORDER_256) out += b64(A[a]!, A[b]!, A[c]!, 4);
    out += b64(0, A[31]!, A[30]!, 3);
  } else {
    for (const [a, b, c] of ORDER_512) out += b64(A[a]!, A[b]!, A[c]!, 4);
    out += b64(0, 0, A[63]!, 2);
  }
  const id = alg === "sha256" ? "$5$" : "$6$";
  return `${id}${explicitRounds || rounds !== 5000 ? `rounds=${rounds}$` : ""}${saltStr}$${out}`;
}

const randomSalt = (len: number) => {
  const b = new Uint8Array(len);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => ITOA64[x & 63]).join("");
};

export function cryptHash(password: string, o: Pick<UnixCryptHashGeneratorOptions, "algorithm" | "rounds" | "explicitRounds">, salt: string): string {
  const pw = utf8(password);
  return o.algorithm === "md5" ? md5Crypt(pw, salt) : shaCrypt(o.algorithm, pw, salt, o.rounds, o.explicitRounds);
}

export function unixCryptHashGenerator(input: string, options: Partial<UnixCryptHashGeneratorOptions>): TransformResult {
  const o: UnixCryptHashGeneratorOptions = { action: options.action ?? "hash", algorithm: options.algorithm ?? "sha512", salt: options.salt ?? "", rounds: options.rounds ?? 5000, explicitRounds: options.explicitRounds ?? false };
  const fail = (message: string): TransformResult => ({ output: "", error: { message } });
  const lines = input.split(/\r?\n/).filter((l, i, a) => l !== "" || i < a.length - 1);
  if (!input.trim()) return { output: "", error: null };

  if (o.action === "verify") {
    const [pwd, hash] = lines.map((l) => l.replace(/\s+$/, ""));
    const m = /^\$(1|5|6)\$(?:rounds=(\d+)\$)?([^$]{0,16})\$([./0-9A-Za-z]+)$/.exec(hash ?? "");
    if (!pwd || !m) return fail("Enter the password on the first line and the full hash ($1$…, $5$… or $6$…) on the second.");
    const alg = m[1] === "1" ? "md5" : m[1] === "5" ? "sha256" : "sha512";
    if (alg === "md5" && (m[2] || m[3]!.length > 8)) return fail("A $1$ hash has an 8-character salt and no rounds parameter.");
    const rounds = m[2] ? Math.max(1000, Number(m[2])) : 5000;
    if (m[2] && Number(m[2]) > 200000) return fail("This hash uses more than 200,000 rounds, which is too slow to check in the browser. Use mkpasswd or a native tool.");
    const got = cryptHash(pwd, { algorithm: alg, rounds, explicitRounds: !!m[2] }, m[3]!);
    return { output: got === hash ? "✓ The password matches this hash.\n" : "✗ The password does not match this hash.\n", error: null };
  }

  if (o.salt) {
    if (!/^[./0-9A-Za-z]+$/.test(o.salt)) return fail("Salt may only contain . / 0-9 A-Z a-z.");
    if (o.salt.length > (o.algorithm === "md5" ? 8 : 16)) return fail(`${o.algorithm === "md5" ? "MD5-crypt" : "SHA-crypt"} uses at most ${o.algorithm === "md5" ? 8 : 16} salt characters.`);
  }
  const out: string[] = [];
  for (const pw of lines) {
    if (pw === "") continue;
    out.push(cryptHash(pw, o, o.salt || randomSalt(o.algorithm === "md5" ? 8 : 16)));
  }
  return { output: out.join("\n") + "\n", error: null };
}
