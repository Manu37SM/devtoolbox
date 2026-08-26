import type { RsaEcKeyPairOptions } from "./schema";

export interface KeyPairPemResult {
  publicKeyPem: string;
  privateKeyPem: string;
  error: string | null;
}

export function derToPem(der: ArrayBuffer, label: "PUBLIC KEY" | "PRIVATE KEY"): string {
  const bytes = new Uint8Array(der);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  const base64 = btoa(binary);
  const lines = base64.match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}

export async function generateKeyPairPem(options: RsaEcKeyPairOptions): Promise<KeyPairPemResult> {
  try {
    const algorithm: RsaHashedKeyGenParams | EcKeyGenParams =
      options.keyType === "rsa"
        ? {
            name: "RSASSA-PKCS1-v1_5",
            modulusLength: options.rsaModulusLength,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
          }
        : { name: "ECDSA", namedCurve: options.ecCurve };

    const keyPair = await crypto.subtle.generateKey(algorithm, true, ["sign", "verify"]);
    const [spki, pkcs8] = await Promise.all([
      crypto.subtle.exportKey("spki", keyPair.publicKey),
      crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
    ]);

    return {
      publicKeyPem: derToPem(spki, "PUBLIC KEY"),
      privateKeyPem: derToPem(pkcs8, "PRIVATE KEY"),
      error: null,
    };
  } catch (err) {
    return {
      publicKeyPem: "",
      privateKeyPem: "",
      error: err instanceof Error ? err.message : "Could not generate a key pair in this browser.",
    };
  }
}
