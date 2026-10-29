import { describe, expect, it } from "vitest";
import { extractXml, runSamlDecoder } from "./transform";

const RESPONSE = `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_r1" Version="2.0" IssueInstant="2024-01-31T10:00:00Z" Destination="https://sp.example.com/acs" InResponseTo="_req42">
  <saml:Issuer>https://idp.example.com</saml:Issuer>
  <samlp:Status><samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/></samlp:Status>
  <saml:Assertion ID="_a1" Version="2.0" IssueInstant="2024-01-31T10:00:00Z">
    <saml:Issuer>https://idp.example.com</saml:Issuer>
    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#"><ds:SignatureValue>abc</ds:SignatureValue></ds:Signature>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">ann@example.com</saml:NameID>
      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer"><saml:SubjectConfirmationData Recipient="https://sp.example.com/acs" NotOnOrAfter="2024-01-31T10:05:00Z"/></saml:SubjectConfirmation>
    </saml:Subject>
    <saml:Conditions NotBefore="2024-01-31T09:59:00Z" NotOnOrAfter="2024-01-31T10:05:00Z"><saml:AudienceRestriction><saml:Audience>https://sp.example.com</saml:Audience></saml:AudienceRestriction></saml:Conditions>
    <saml:AuthnStatement AuthnInstant="2024-01-31T09:59:58Z" SessionIndex="_s1"><saml:AuthnContext><saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef></saml:AuthnContext></saml:AuthnStatement>
    <saml:AttributeStatement>
      <saml:Attribute Name="groups"><saml:AttributeValue>admins</saml:AttributeValue><saml:AttributeValue>dev</saml:AttributeValue></saml:Attribute>
      <saml:Attribute Name="urn:oid:2.5.4.42" FriendlyName="givenName"><saml:AttributeValue>Ann</saml:AttributeValue></saml:Attribute>
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`;
const REQUEST = `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ID="_req42" Version="2.0" IssueInstant="2024-01-31T09:59:50Z" AssertionConsumerServiceURL="https://sp.example.com/acs" ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"><saml:Issuer xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion">https://sp.example.com</saml:Issuer><samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true"/></samlp:AuthnRequest>`;

const b64 = (s: string) => btoa(String.fromCharCode(...new TextEncoder().encode(s)));
async function deflateRawB64(s: string): Promise<string> {
  const stream = new Blob([s]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  return btoa(String.fromCharCode(...bytes));
}
const NOW = new Date("2024-01-31T10:02:00Z");

describe("extractXml", () => {
  it("decodes HTTP-POST base64 and HTTP-Redirect deflated values from a URL", async () => {
    expect((await extractXml(b64(RESPONSE))).binding).toBe("HTTP-POST (base64)");
    const deflated = encodeURIComponent(await deflateRawB64(REQUEST));
    const r = await extractXml(`https://idp.example.com/sso?SAMLRequest=${deflated}&RelayState=xyz`);
    expect(r.binding).toBe("HTTP-Redirect (deflate + base64)");
    expect(r.param).toBe("SAMLRequest");
    expect(r.xml).toBe(REQUEST);
  });
  it("rejects junk", async () => {
    await expect(extractXml("not saml at all!")).rejects.toThrow(/not XML, base64/);
  });
});

describe("runSamlDecoder", () => {
  it("summarises a response with validity windows and attributes", async () => {
    const out = (await runSamlDecoder(b64(RESPONSE), { output: "summary" }, NOW)).output;
    expect(out).toContain("Response  ID=_r1");
    expect(out).toContain("  Issuer: https://idp.example.com");
    expect(out).toContain("  Status: Success");
    expect(out).toContain("Assertion  ID=_a1  (signed)");
    expect(out).toContain("  NameID: ann@example.com  (emailAddress)");
    expect(out).toContain("NotOnOrAfter=2024-01-31T10:05:00Z -> valid now, expires in 3 min");
    expect(out).toContain("  Audience: https://sp.example.com");
    expect(out).toContain("    groups = [admins, dev]");
    expect(out).toContain("    urn:oid:2.5.4.42 (givenName) = Ann");
    expect(out).toContain("does not verify XML signatures");
    expect(out).not.toContain("Neither the Response");
  });
  it("flags expired and unsigned responses", async () => {
    const unsigned = RESPONSE.replace(/<ds:Signature[\s\S]*?<\/ds:Signature>/, "");
    const out = (await runSamlDecoder(unsigned, { output: "summary" }, new Date("2024-01-31T13:00:00Z"))).output;
    expect(out).toContain("-> EXPIRED 3 h ago");
    expect(out).toContain("Neither the Response nor any Assertion carries a Signature element");
  });
  it("summarises AuthnRequests and pretty-prints XML", async () => {
    const out = (await runSamlDecoder(REQUEST, { output: "both" }, NOW)).output;
    expect(out).toContain("AuthnRequest  ID=_req42");
    expect(out).toContain("  ProtocolBinding: HTTP-POST");
    expect(out).toContain("  NameIDPolicy: urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress");
    expect(out).toContain('<samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress" AllowCreate="true" />');
  });
});
