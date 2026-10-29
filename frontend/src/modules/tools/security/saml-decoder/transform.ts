import type { TransformResult } from "@/lib/tool-transform";
import { base64ToBytes } from "@/lib/byte-input";
import { parseXml, serializeXml, type XmlElement, type XmlNode } from "../../data-format/xml-core";
import type { SamlDecoderOptions } from "./schema";

const local = (tag: string) => tag.split(":").pop()!;
const isEl = (n: XmlNode): n is XmlElement => "tag" in n;
export const findAll = (e: XmlElement, name: string): XmlElement[] => [...(local(e.tag) === name ? [e] : []), ...e.children.filter(isEl).flatMap((c) => findAll(c, name))];
const find = (e: XmlElement, name: string) => findAll(e, name)[0];
const text = (e?: XmlElement): string => (e ? e.children.map((c) => (isEl(c) ? text(c) : c.text)).join("").trim() : "");
const directChild = (e: XmlElement, name: string) => e.children.filter(isEl).find((c) => local(c.tag) === name);

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Accepts raw XML, a base64 (optionally deflated) value, a query string or a full URL. */
export async function extractXml(input: string): Promise<{ xml: string; binding: string; param?: string }> {
  let s = input.trim();
  if (s.startsWith("<")) return { xml: s, binding: "raw XML" };
  let param: string | undefined;
  const m = /(?:^|[?&\s])(SAMLResponse|SAMLRequest)=([^&\s]+)/.exec(s);
  if (m) { param = m[1]; s = m[2]!; }
  if (/%[0-9A-Fa-f]{2}/.test(s)) s = decodeURIComponent(s.replace(/\+/g, "%20"));
  else if (m) s = s.replace(/ /g, "+");
  let bytes: Uint8Array;
  try { bytes = base64ToBytes(s); } catch { throw new Error("Input is not XML, base64, or a URL with SAMLRequest/SAMLResponse."); }
  const asText = new TextDecoder().decode(bytes).replace(/^﻿/, "").trim();
  if (asText.startsWith("<")) return { xml: asText, binding: "HTTP-POST (base64)", param };
  try {
    const inflated = new TextDecoder().decode(await inflateRaw(bytes)).trim();
    if (inflated.startsWith("<")) return { xml: inflated, binding: "HTTP-Redirect (deflate + base64)", param };
  } catch { /* fall through */ }
  throw new Error("Decoded data is neither XML nor deflated XML.");
}

function window(notBefore: string | undefined, notOnOrAfter: string | undefined, now: Date): string {
  const nb = notBefore ? Date.parse(notBefore) : NaN;
  const na = notOnOrAfter ? Date.parse(notOnOrAfter) : NaN;
  const rel = (ms: number) => { const a = Math.abs(ms); const s = Math.round(a / 1000); return s < 120 ? `${s}s` : s < 7200 ? `${Math.round(s / 60)} min` : s < 172800 ? `${Math.round(s / 3600)} h` : `${Math.round(s / 86400)} days`; };
  if (!Number.isNaN(nb) && now.getTime() < nb) return `NOT YET VALID (starts in ${rel(nb - now.getTime())}; check clock skew)`;
  if (!Number.isNaN(na) && now.getTime() >= na) return `EXPIRED ${rel(now.getTime() - na)} ago`;
  if (!Number.isNaN(na)) return `valid now, expires in ${rel(na - now.getTime())}`;
  return "no time limit given";
}

export function summarize(root: XmlElement, now: Date): string[] {
  const out: string[] = [];
  const kind = local(root.tag);
  const a = root.attributes;
  out.push(`${kind}${a.ID ? `  ID=${a.ID}` : ""}`);
  if (a.IssueInstant) out.push(`  IssueInstant: ${a.IssueInstant}`);
  if (a.Destination) out.push(`  Destination: ${a.Destination}`);
  if (a.InResponseTo) out.push(`  InResponseTo: ${a.InResponseTo}`);
  else if (kind === "Response") out.push("  InResponseTo: (none: IdP-initiated, or the SP did not track the request)");
  const issuer = directChild(root, "Issuer");
  if (issuer) out.push(`  Issuer: ${text(issuer)}`);

  const status = directChild(root, "Status");
  if (status) {
    const codes = findAll(status, "StatusCode").map((c) => (c.attributes.Value ?? "").split(":").pop());
    const msg = text(find(status, "StatusMessage"));
    out.push(`  Status: ${codes.join(" / ")}${msg ? ` - ${msg}` : ""}`);
  }
  if (kind === "AuthnRequest") {
    if (a.AssertionConsumerServiceURL) out.push(`  AssertionConsumerServiceURL: ${a.AssertionConsumerServiceURL}`);
    if (a.ProtocolBinding) out.push(`  ProtocolBinding: ${a.ProtocolBinding.split(":").pop()}`);
    const policy = find(root, "NameIDPolicy");
    if (policy?.attributes.Format) out.push(`  NameIDPolicy: ${policy.attributes.Format}`);
    if (a.ForceAuthn) out.push(`  ForceAuthn: ${a.ForceAuthn}`);
    if (a.IsPassive) out.push(`  IsPassive: ${a.IsPassive}`);
    const ctx = findAll(root, "AuthnContextClassRef").map(text);
    if (ctx.length) out.push(`  RequestedAuthnContext: ${ctx.join(", ")}`);
  }
  if (kind === "LogoutRequest") {
    const nameId = find(root, "NameID");
    if (nameId) out.push(`  NameID: ${text(nameId)}`);
    const si = findAll(root, "SessionIndex").map(text);
    if (si.length) out.push(`  SessionIndex: ${si.join(", ")}`);
  }

  const responseSigned = !!directChild(root, "Signature");
  const assertions = findAll(root, "Assertion");
  const encrypted = findAll(root, "EncryptedAssertion").length;
  for (const [i, as] of assertions.entries()) {
    out.push("", `Assertion${assertions.length > 1 ? ` #${i + 1}` : ""}${as.attributes.ID ? `  ID=${as.attributes.ID}` : ""}${directChild(as, "Signature") ? "  (signed)" : ""}`);
    const ai = directChild(as, "Issuer");
    if (ai) out.push(`  Issuer: ${text(ai)}`);
    const nameId = find(as, "NameID");
    if (nameId) out.push(`  NameID: ${text(nameId)}${nameId.attributes.Format ? `  (${nameId.attributes.Format.split(":").pop()})` : ""}`);
    const scd = find(as, "SubjectConfirmationData");
    if (scd) out.push(`  SubjectConfirmation: Recipient=${scd.attributes.Recipient ?? "-"}, NotOnOrAfter=${scd.attributes.NotOnOrAfter ?? "-"} -> ${window(undefined, scd.attributes.NotOnOrAfter, now)}`);
    const cond = find(as, "Conditions");
    if (cond) {
      out.push(`  Conditions: NotBefore=${cond.attributes.NotBefore ?? "-"}, NotOnOrAfter=${cond.attributes.NotOnOrAfter ?? "-"} -> ${window(cond.attributes.NotBefore, cond.attributes.NotOnOrAfter, now)}`);
      const aud = findAll(cond, "Audience").map(text);
      if (aud.length) out.push(`  Audience: ${aud.join(", ")}`);
    }
    const authn = find(as, "AuthnStatement");
    if (authn) {
      out.push(`  AuthnInstant: ${authn.attributes.AuthnInstant ?? "-"}${authn.attributes.SessionIndex ? `, SessionIndex=${authn.attributes.SessionIndex}` : ""}${authn.attributes.SessionNotOnOrAfter ? `, SessionNotOnOrAfter=${authn.attributes.SessionNotOnOrAfter}` : ""}`);
      const ref = text(find(authn, "AuthnContextClassRef"));
      if (ref) out.push(`  AuthnContext: ${ref}`);
    }
    const attrs = findAll(as, "Attribute");
    if (attrs.length) {
      out.push("  Attributes:");
      for (const at of attrs) {
        const vals = findAll(at, "AttributeValue").map(text);
        out.push(`    ${at.attributes.Name ?? "?"}${at.attributes.FriendlyName ? ` (${at.attributes.FriendlyName})` : ""} = ${vals.length > 1 ? `[${vals.join(", ")}]` : vals[0] ?? ""}`);
      }
    }
  }
  const warnings: string[] = [];
  if (encrypted) warnings.push(`${encrypted} EncryptedAssertion element${encrypted > 1 ? "s" : ""}: decrypting needs the SP's private key, so its contents are not shown.`);
  if (kind === "Response" && !responseSigned && !assertions.some((as) => directChild(as, "Signature")) && assertions.length) warnings.push("Neither the Response nor any Assertion carries a Signature element. A service provider must reject this.");
  warnings.push("This tool decodes only. It does not verify XML signatures, so never trust a message because it decodes cleanly.");
  out.push("", ...warnings.map((w) => `! ${w}`));
  return out;
}

export async function runSamlDecoder(input: string, options: SamlDecoderOptions, now: Date = new Date()): Promise<TransformResult> {
  if (!input.trim()) return { output: "", error: null };
  let ex: Awaited<ReturnType<typeof extractXml>>;
  try { ex = await extractXml(input); } catch (e) { return { output: "", error: { message: (e as Error).message } }; }
  let root: XmlElement;
  try { root = parseXml(ex.xml); } catch (e) { return { output: "", error: { message: `Decoded, but the XML did not parse: ${(e as Error).message}` } }; }
  const parts: string[] = [];
  if (options.output !== "xml") parts.push([`Binding: ${ex.binding}${ex.param ? ` (${ex.param})` : ""}`, ...summarize(root, now)].join("\n"));
  if (options.output !== "summary") parts.push(serializeXml(root, 2));
  return { output: parts.join("\n\n"), error: null };
}
