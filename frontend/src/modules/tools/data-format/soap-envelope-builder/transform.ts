import { KJUR, b64tohex, hextob64 } from "jsrsasign";
import type { TransformResult } from "@/lib/tool-transform";
import type { SoapEnvelopeBuilderOptions } from "./schema";
import { jsonValueToXml, parseXml, serializeXml, xmlToJsonValue, type XmlElement } from "../xml-core";

type Opts = SoapEnvelopeBuilderOptions;

const NS = {
  "1.1": "http://schemas.xmlsoap.org/soap/envelope/",
  "1.2": "http://www.w3.org/2003/05/soap-envelope",
} as const;
const WSSE = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd";
const WSU = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-utility-1.0.xsd";
const PWD_TEXT = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordText";
const PWD_DIGEST = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest";
const NONCE_ENC = "http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-soap-message-security-1.0#Base64Binary";
export const EXAMPLE_NONCE = "WScqanjCEAC4mQoBE07sAQ==";

const NAME = /^[A-Za-z_][\w.-]*$/;

function el(tag: string, children: Array<XmlElement | { text: string }> = [], attributes: Record<string, string> = {}): XmlElement {
  return { tag, attributes, children };
}
const txt = (tag: string, text: string, attributes: Record<string, string> = {}) => el(tag, [{ text }], attributes);

/** Add a namespace prefix to an element tree (not to attributes). */
function prefixTree(e: XmlElement, prefix: string, children: boolean, depth = 0): XmlElement {
  const apply = depth === 0 || children;
  return {
    tag: apply && prefix ? `${prefix}:${e.tag}` : e.tag,
    attributes: e.attributes,
    children: e.children.map((c) => ("tag" in c ? prefixTree(c, prefix, children, depth + 1) : c)),
  };
}

function checkNames(v: unknown, path: string): void {
  if (Array.isArray(v)) {
    v.forEach((x) => checkNames(x, path));
  } else if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (k.startsWith("@_") || k === "#text") continue;
      if (!NAME.test(k)) throw new Error(`"${k}" (at ${path || "root"}) is not a valid XML element name`);
      checkNames(x, `${path}/${k}`);
    }
  }
}

/** PasswordDigest = Base64( SHA-1( nonce-bytes + created + password ) ), per the WS-Security UsernameToken Profile 1.0 */
export function passwordDigest(nonceB64: string, created: string, password: string): string {
  const md = new KJUR.crypto.MessageDigest({ alg: "sha1", prov: "cryptojs" });
  const pw = Array.from(new TextEncoder().encode(created + password), (b) => b.toString(16).padStart(2, "0")).join("");
  md.updateHex(b64tohex(nonceB64) + pw);
  return hextob64(md.digest());
}

function securityHeader(o: Opts, ns: string, nonce: string, created: string): XmlElement {
  const tokenKids: XmlElement[] = [txt("wsse:Username", o.username)];
  if (o.security === "digest") {
    tokenKids.push(txt("wsse:Password", passwordDigest(nonce, created, o.password), { Type: PWD_DIGEST }));
    tokenKids.push(txt("wsse:Nonce", nonce, { EncodingType: NONCE_ENC }));
    tokenKids.push(txt("wsu:Created", created));
  } else {
    tokenKids.push(txt("wsse:Password", o.password, { Type: PWD_TEXT }));
  }
  const attrs: Record<string, string> = { "xmlns:wsse": WSSE };
  if (o.security === "digest") attrs["xmlns:wsu"] = WSU;
  if (o.mustUnderstand) attrs[`${ns}:mustUnderstand`] = o.version === "1.1" ? "1" : "true";
  const token = el("wsse:UsernameToken", tokenKids, o.security === "digest" ? { "wsu:Id": "UsernameToken-1" } : {});
  return el("wsse:Security", [token], attrs);
}

function envelope(o: Opts, header: XmlElement[], body: XmlElement[]): XmlElement {
  const ns = "soapenv";
  const kids: XmlElement[] = [];
  if (header.length) kids.push(el(`${ns}:Header`, header));
  kids.push(el(`${ns}:Body`, body));
  return el(`${ns}:Envelope`, kids, { [`xmlns:${ns}`]: NS[o.version] });
}

function serialize(e: XmlElement, o: Opts): string {
  const s = o.indent === 0 ? serializeXml(e, 0).replace(/\n/g, "") : serializeXml(e, o.indent);
  return (o.xmlDeclaration ? '<?xml version="1.0" encoding="UTF-8"?>' + (o.indent === 0 ? "" : "\n") : "") + s;
}

function detailKids(detail: unknown): Array<XmlElement | { text: string }> {
  return typeof detail === "object" && detail !== null && !Array.isArray(detail) ? jsonValueToXml("d", detail).children : [{ text: String(detail) }];
}

export function buildFault(j: Record<string, unknown>, o: Opts): XmlElement {
  const code = String(j.code ?? "Server");
  const reason = String(j.reason ?? j.message ?? j.faultstring ?? "");
  if (!reason) throw new Error('A fault needs a "reason" (message) field');
  const detail = j.detail;
  if (o.version === "1.1") {
    const fc = /^(Client|Server|VersionMismatch|MustUnderstand)$/.test(code) ? `soapenv:${code}` : code === "Sender" ? "soapenv:Client" : code === "Receiver" ? "soapenv:Server" : code;
    const kids: XmlElement[] = [txt("faultcode", fc), txt("faultstring", reason)];
    if (j.actor) kids.push(txt("faultactor", String(j.actor)));
    if (detail !== undefined) kids.push(el("detail", detailKids(detail)));
    return el("soapenv:Fault", kids);
  }
  const map: Record<string, string> = { Client: "Sender", Server: "Receiver", Sender: "Sender", Receiver: "Receiver", VersionMismatch: "VersionMismatch", MustUnderstand: "MustUnderstand", DataEncodingUnknown: "DataEncodingUnknown" };
  const v = map[code] ?? code;
  const codeKids: XmlElement[] = [txt("soapenv:Value", v.includes(":") ? v : `soapenv:${v}`)];
  if (j.subcode) codeKids.push(el("soapenv:Subcode", [txt("soapenv:Value", String(j.subcode))]));
  const kids: XmlElement[] = [el("soapenv:Code", codeKids), el("soapenv:Reason", [txt("soapenv:Text", reason, { "xml:lang": String(j.lang ?? "en") })])];
  if (j.actor) kids.push(txt("soapenv:Role", String(j.actor)));
  if (detail !== undefined) kids.push(el("soapenv:Detail", detailKids(detail)));
  return el("soapenv:Fault", kids);
}

function stripPrefix(t: string): string {
  return t.includes(":") ? t.slice(t.indexOf(":") + 1) : t;
}
function dePrefix(e: XmlElement): XmlElement {
  const attributes: Record<string, string> = {};
  for (const [k, v] of Object.entries(e.attributes)) if (!k.startsWith("xmlns")) attributes[stripPrefix(k)] = v;
  return { tag: stripPrefix(e.tag), attributes, children: e.children.map((c) => ("tag" in c ? dePrefix(c) : c)) };
}

export function parseSoap(xml: string): unknown {
  const root = parseXml(xml);
  const rootLocal = stripPrefix(root.tag);
  if (rootLocal !== "Envelope") throw new Error(`Root element is <${root.tag}>, expected a SOAP Envelope`);
  const nsAttr = Object.entries(root.attributes).find(([k]) => k === `xmlns${root.tag.includes(":") ? ":" + root.tag.split(":")[0] : ""}`);
  const nsUri = nsAttr?.[1] ?? "";
  const version = nsUri === NS["1.1"] ? "1.1" : nsUri === NS["1.2"] ? "1.2" : "unknown";
  const kids = root.children.filter((c): c is XmlElement => "tag" in c);
  const header = kids.find((k) => stripPrefix(k.tag) === "Header");
  const body = kids.find((k) => stripPrefix(k.tag) === "Body");
  if (!body) throw new Error("No <Body> element in the envelope");
  const bodyKids = body.children.filter((c): c is XmlElement => "tag" in c);
  const first = bodyKids[0];
  const out: Record<string, unknown> = { version, namespace: nsUri };
  if (version === "unknown") out.warning = `Envelope namespace "${nsUri}" is not a SOAP 1.1 or 1.2 namespace`;
  if (header) out.headers = Object.fromEntries(header.children.filter((c): c is XmlElement => "tag" in c).map((h) => [stripPrefix(h.tag), xmlToJsonValue(dePrefix(h))]));
  if (first && stripPrefix(first.tag) === "Fault") {
    out.fault = xmlToJsonValue(dePrefix(first));
  } else if (first) {
    const ns = Object.entries(first.attributes).find(([k]) => k.startsWith("xmlns"))?.[1];
    out.operation = stripPrefix(first.tag);
    if (ns) out.operationNamespace = ns;
    out.body = xmlToJsonValue(dePrefix(first));
  }
  const mu = header?.children.filter((c): c is XmlElement => "tag" in c).filter((h) => Object.keys(h.attributes).some((k) => /mustUnderstand$/.test(k) && /^(1|true)$/.test(h.attributes[k]!)));
  if (mu?.length) out.mustUnderstand = mu.map((h) => stripPrefix(h.tag));
  return out;
}

export function soapEnvelopeBuilder(input: string, options: Partial<Opts> = {}): TransformResult {
  const o: Opts = {
    mode: options.mode ?? "build",
    version: options.version ?? "1.1",
    namespace: options.namespace ?? "http://example.com/service",
    prefix: options.prefix ?? "ns",
    childForm: options.childForm ?? "unqualified",
    soapAction: options.soapAction ?? "",
    security: options.security ?? "none",
    username: options.username ?? "",
    password: options.password ?? "",
    nonce: options.nonce ?? "",
    created: options.created ?? "",
    mustUnderstand: options.mustUnderstand ?? true,
    headers: options.headers ?? "",
    indent: options.indent ?? 2,
    xmlDeclaration: options.xmlDeclaration ?? true,
    output: options.output ?? "envelope",
    endpoint: options.endpoint ?? "https://example.com/service",
  };
  if (input.trim() === "") return { output: "", error: null };
  try {
    if (o.mode === "parse") return { output: JSON.stringify(parseSoap(input), null, 2), error: null };

    let data: unknown;
    try {
      data = JSON.parse(input);
    } catch (e) {
      return { output: "", error: { message: `Input must be JSON: ${(e as Error).message}` } };
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) return { output: "", error: { message: "Input must be a JSON object" } };

    let bodyEls: XmlElement[];
    if (o.mode === "fault") {
      bodyEls = [buildFault(data as Record<string, unknown>, o)];
    } else {
      const keys = Object.keys(data as object);
      if (keys.length === 0) return { output: "", error: { message: "Give the operation as the top-level key, e.g. {\"GetQuote\": {\"symbol\": \"ACME\"}}" } };
      if (o.prefix && !NAME.test(o.prefix)) return { output: "", error: { message: "Prefix must be a valid XML name" } };
      checkNames(data, "");
      bodyEls = keys.map((k) => {
        const e = jsonValueToXml(k, (data as Record<string, unknown>)[k]);
        const q = prefixTree(e, o.prefix, o.childForm === "qualified");
        if (o.namespace) q.attributes = { [o.prefix ? `xmlns:${o.prefix}` : "xmlns"]: o.namespace, ...q.attributes };
        return q;
      });
    }

    const header: XmlElement[] = [];
    if (o.security !== "none") {
      if (!o.username) return { output: "", error: { message: "WS-Security needs a username" } };
      const nonce = o.nonce || EXAMPLE_NONCE;
      const created = o.created || new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
      header.push(securityHeader(o, "soapenv", nonce, created));
    }
    if (o.headers.trim()) {
      let h: unknown;
      try {
        h = JSON.parse(o.headers);
      } catch (e) {
        return { output: "", error: { message: `Header JSON is invalid: ${(e as Error).message}` } };
      }
      if (!h || typeof h !== "object" || Array.isArray(h)) return { output: "", error: { message: "Headers must be a JSON object" } };
      checkNames(h, "headers");
      for (const [k, v] of Object.entries(h as Record<string, unknown>)) {
        const e = prefixTree(jsonValueToXml(k, v), o.prefix, o.childForm === "qualified");
        if (o.namespace) e.attributes = { [o.prefix ? `xmlns:${o.prefix}` : "xmlns"]: o.namespace, ...e.attributes };
        header.push(e);
      }
    }
    const xml = serialize(envelope(o, header, bodyEls), o);
    if (o.output === "envelope") return { output: xml, error: null };

    const ct = o.version === "1.1" ? "text/xml; charset=utf-8" : `application/soap+xml; charset=utf-8${o.soapAction ? `; action="${o.soapAction}"` : ""}`;
    const lines: string[] = [];
    let host = "example.com";
    let path = "/";
    try {
      const u = new URL(o.endpoint);
      host = u.host;
      path = u.pathname + u.search;
    } catch {
      return { output: "", error: { message: `Endpoint "${o.endpoint}" is not a valid URL` } };
    }
    if (o.output === "http") {
      lines.push(`POST ${path} HTTP/1.1`, `Host: ${host}`, `Content-Type: ${ct}`, `Content-Length: ${new TextEncoder().encode(xml).length}`);
      if (o.version === "1.1") lines.push(`SOAPAction: "${o.soapAction}"`);
      lines.push("", xml);
      return { output: lines.join("\n"), error: null };
    }
    const q = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
    const cmd = [`curl -X POST ${q(o.endpoint)}`, `  -H ${q("Content-Type: " + ct)}`];
    if (o.version === "1.1") cmd.push(`  -H ${q(`SOAPAction: "${o.soapAction}"`)}`);
    cmd.push(`  --data-binary ${q(xml)}`);
    return { output: cmd.join(" \\\n"), error: null };
  } catch (e) {
    return { output: "", error: { message: (e as Error).message } };
  }
}
