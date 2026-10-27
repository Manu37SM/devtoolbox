import type { TransformResult } from "@/lib/tool-transform";
import type { AesEncryptDecryptOptions } from "./schema";

/** Output layout: version(1) | salt(16) | iv(12) | AES-256-GCM ciphertext+tag. Key = PBKDF2-HMAC-SHA256(password, salt, 600k). */
const VERSION = 1;
const SALT_BYTES = 16;
const IV_BYTES = 12;
export const PBKDF2_ITERATIONS = 600_000;

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text.replace(/\s+/g, ""));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function deriveKey(password: string, salt: Uint8Array, usage: KeyUsage[], iterations = PBKDF2_ITERATIONS): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password) as BufferSource, "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    usage,
  );
}

export async function encryptText(plaintext: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, new TextEncoder().encode(plaintext) as BufferSource));
  const packed = new Uint8Array(1 + SALT_BYTES + IV_BYTES + ciphertext.length);
  packed[0] = VERSION;
  packed.set(salt, 1);
  packed.set(iv, 1 + SALT_BYTES);
  packed.set(ciphertext, 1 + SALT_BYTES + IV_BYTES);
  return toBase64(packed);
}

export async function decryptText(payload: string, password: string): Promise<string> {
  let packed: Uint8Array;
  try {
    packed = fromBase64(payload);
  } catch {
    throw new Error("The input isn't valid Base64.");
  }
  if (packed.length < 1 + SALT_BYTES + IV_BYTES + 16) throw new Error("The input is too short to be encrypted data from this tool.");
  if (packed[0] !== VERSION) throw new Error("Unrecognised format — this text wasn't produced by this tool.");
  const salt = packed.slice(1, 1 + SALT_BYTES);
  const iv = packed.slice(1 + SALT_BYTES, 1 + SALT_BYTES + IV_BYTES);
  const data = packed.slice(1 + SALT_BYTES + IV_BYTES);
  const key = await deriveKey(password, salt, ["decrypt"]);
  try {
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, data as BufferSource);
    return new TextDecoder("utf-8", { fatal: true }).decode(plain);
  } catch {
    throw new Error("Decryption failed — wrong password, or the data was altered.");
  }
}

export async function aesEncryptDecrypt(input: string, options: AesEncryptDecryptOptions): Promise<TransformResult> {
  if (input.trim().length === 0) return { output: "", error: null };
  if (options.password.length === 0) return { output: "", error: { message: "Enter a password." } };
  try {
    const output = options.mode === "encrypt" ? await encryptText(input, options.password) : await decryptText(input.trim(), options.password);
    return { output, error: null };
  } catch (e) {
    return { output: "", error: { message: e instanceof Error ? e.message : "Operation failed." } };
  }
}
