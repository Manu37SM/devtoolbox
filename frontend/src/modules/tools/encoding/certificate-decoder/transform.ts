import * as jsrsasign from "jsrsasign";

export interface CertificateInfo {
  subject: string;
  issuer: string;
  serialNumberHex: string;
  notBefore: string;
  notAfter: string;
  isCurrentlyValid: boolean;
  signatureAlgorithm: string;
  publicKeyAlgorithm: string;
  version: number;
  isSelfSigned: boolean;
}

export interface CertificateDecoderResult {
  info: CertificateInfo | null;
  error: string | null;
}

export function decodeCertificate(pem: string): CertificateDecoderResult {
  const trimmed = pem.trim();
  if (trimmed.length === 0) return { info: null, error: null };

  if (!trimmed.includes("-----BEGIN CERTIFICATE-----")) {
    return { info: null, error: "Expected a PEM block starting with -----BEGIN CERTIFICATE-----." };
  }

  try {
    const x509 = new jsrsasign.X509();
    x509.readCertPEM(trimmed);

    const notBefore = jsrsasign.zulutodate(x509.getNotBefore());
    const notAfter = jsrsasign.zulutodate(x509.getNotAfter());
    const now = new Date();

    const publicKey = x509.getPublicKey() as { type?: string; curveName?: string };
    const publicKeyAlgorithm =
      publicKey?.type === "EC" ? `EC (${publicKey.curveName ?? "unknown curve"})` : (publicKey?.type ?? "unknown");

    const subject = x509.getSubjectString();
    const issuer = x509.getIssuerString();

    return {
      info: {
        subject,
        issuer,
        serialNumberHex: x509.getSerialNumberHex(),
        notBefore: notBefore.toISOString(),
        notAfter: notAfter.toISOString(),
        isCurrentlyValid: now >= notBefore && now <= notAfter,
        signatureAlgorithm: x509.getSignatureAlgorithmField(),
        publicKeyAlgorithm,
        version: x509.getVersion(),
        isSelfSigned: subject === issuer,
      },
      error: null,
    };
  } catch (err) {
    return {
      info: null,
      error: err instanceof Error ? err.message : "Could not parse this certificate — check it's a valid PEM X.509 certificate.",
    };
  }
}
