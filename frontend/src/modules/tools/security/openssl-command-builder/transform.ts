import type { TransformResult } from "@/lib/tool-transform";
import type { OpensslCommandBuilderOptions } from "./schema";

type Fields = Record<string, string>;

export function parseFields(input: string): Fields {
  const f: Fields = {};
  for (const raw of input.split(/\r?\n/)) {
    const l = raw.trim();
    if (!l || l.startsWith("#")) continue;
    const i = l.indexOf(":");
    if (i <= 0) continue;
    f[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim();
  }
  return f;
}

/** Quote for POSIX shells only when needed. */
export function sh(s: string): string {
  return /^[A-Za-z0-9_@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`;
}

const isIp = (s: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(s) || s.includes(":");

export function buildSubject(f: Fields): string {
  const parts: string[] = [];
  const add = (k: string, v?: string) => { if (v) parts.push(`/${k}=${v.replace(/\//g, "\\/")}`); };
  add("C", f.c ?? f.country); add("ST", f.st ?? f.state); add("L", f.l ?? f.city);
  add("O", f.o ?? f.org); add("OU", f.ou); add("CN", f.cn);
  return parts.join("");
}

export function buildSan(f: Fields): string {
  const names = (f.san ?? "").split(/[,\s]+/).filter(Boolean);
  if (f.cn && !names.includes(f.cn)) names.unshift(f.cn);
  return names.map((n) => (isIp(n) ? `IP:${n}` : `DNS:${n}`)).join(",");
}

export function buildOpenssl(input: string, o: OpensslCommandBuilderOptions): TransformResult {
  const f = parseFields(input);
  const key = f.key ?? "server.key", cert = f.cert ?? "server.crt", csr = f.csr ?? "server.csr";
  const bits = f.bits ?? "2048", days = f.days ?? "365", curve = f.curve ?? "prime256v1";
  const need = (...ks: string[]): string | null => { const m = ks.filter((k) => !f[k]); return m.length ? `Missing field: ${m.join(", ")}` : null; };
  const fail = (m: string): TransformResult => ({ output: "", error: { message: m } });
  if (!/^\d+$/.test(bits)) return fail("bits must be a number");
  if (!/^\d+$/.test(days)) return fail("days must be a number");
  const enc = o.encryptKey ? "" : " -nodes";
  const cmds: string[] = [];
  const san = buildSan(f), subj = buildSubject(f);
  const sanExt = san ? ` -addext ${sh(`subjectAltName=${san}`)}` : "";

  switch (o.task) {
    case "rsa-key": {
      cmds.push(`openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:${bits}${o.encryptKey ? " -aes-256-cbc" : ""} -out ${sh(key)}`);
      cmds.push(`openssl pkey -in ${sh(key)} -pubout -out ${sh(f.pub ?? "public.pem")}`);
      break;
    }
    case "ec-key": {
      cmds.push(`openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:${curve} -pkeyopt ec_param_enc:named_curve${o.encryptKey ? " -aes-256-cbc" : ""} -out ${sh(key)}`);
      break;
    }
    case "csr": {
      const e = need("cn"); if (e) return fail(e);
      cmds.push(`openssl req -new -newkey rsa:${bits}${enc} -keyout ${sh(key)} -out ${sh(csr)} -${o.digest}${subj ? ` -subj ${sh(subj)}` : ""}${sanExt}`);
      break;
    }
    case "self-signed": {
      const e = need("cn"); if (e) return fail(e);
      cmds.push(`openssl req -x509 -newkey rsa:${bits}${enc} -keyout ${sh(key)} -out ${sh(cert)} -days ${days} -${o.digest} -subj ${sh(subj)}${sanExt}`);
      break;
    }
    case "view-cert": cmds.push(`openssl x509 -in ${sh(cert)} -noout -text`, `openssl x509 -in ${sh(cert)} -noout -subject -issuer -dates -fingerprint -${o.digest}`); break;
    case "view-csr": cmds.push(`openssl req -in ${sh(csr)} -noout -text -verify`); break;
    case "verify-chain": {
      const e = need("ca"); if (e) return fail(e);
      cmds.push(`openssl verify -CAfile ${sh(f.ca!)}${f.intermediate ? ` -untrusted ${sh(f.intermediate)}` : ""} ${sh(cert)}`);
      break;
    }
    case "pem-to-der": cmds.push(`openssl x509 -in ${sh(cert)} -outform DER -out ${sh(f.out ?? "server.der")}`); break;
    case "der-to-pem": cmds.push(`openssl x509 -inform DER -in ${sh(f.in ?? "server.der")} -out ${sh(cert)}`); break;
    case "pkcs12-export":
      cmds.push(`openssl pkcs12 -export -inkey ${sh(key)} -in ${sh(cert)}${f.ca ? ` -certfile ${sh(f.ca)}` : ""} -name ${sh(f.name ?? "server")} -out ${sh(f.out ?? "server.p12")}`);
      break;
    case "pkcs12-extract": {
      const p12 = f.p12 ?? "server.p12";
      cmds.push(`openssl pkcs12 -in ${sh(p12)} -nokeys -out ${sh(cert)}`, `openssl pkcs12 -in ${sh(p12)} -nocerts${enc} -out ${sh(key)}`);
      break;
    }
    case "s-client": {
      const e = need("host"); if (e) return fail(e);
      const port = f.port ?? "443";
      cmds.push(`openssl s_client -connect ${sh(`${f.host}:${port}`)} -servername ${sh(f.host!)} -showcerts </dev/null`);
      cmds.push(`echo | openssl s_client -connect ${sh(`${f.host}:${port}`)} -servername ${sh(f.host!)} 2>/dev/null | openssl x509 -noout -dates -subject -issuer`);
      break;
    }
    case "check-key-match":
      cmds.push(`openssl x509 -in ${sh(cert)} -noout -pubkey | openssl sha256`, `openssl pkey -in ${sh(key)} -pubout | openssl sha256`);
      break;
    case "hash-file": cmds.push(`openssl dgst -${o.digest} ${sh(f.file ?? "file.bin")}`); break;
    case "dhparam": cmds.push(`openssl dhparam -out ${sh(f.out ?? "dhparam.pem")} ${bits === "2048" ? "2048" : bits}`); break;
  }
  const notes: string[] = [];
  if (!o.encryptKey && ["csr", "self-signed", "pkcs12-extract"].includes(o.task)) notes.push("# -nodes writes the private key unencrypted. Protect it (chmod 600) and never commit it.");
  if (o.task === "self-signed") notes.push("# Self-signed certs are for local/testing use; browsers will not trust them by default.");
  if (["rsa-key", "csr", "self-signed"].includes(o.task) && Number(bits) < 2048) notes.push("# WARNING: RSA keys under 2048 bits are considered weak.");
  return { output: [...notes, ...cmds].join("\n") + "\n", error: null };
}
