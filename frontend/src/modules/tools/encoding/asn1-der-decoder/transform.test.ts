import { describe, expect, it } from "vitest";
import { parseByteInput } from "@/lib/byte-input";
import { decodeDer, decodeOid, flattenNodes, runAsn1DerDecoder, tagName } from "./transform";

const CERT = `-----BEGIN CERTIFICATE-----
MIICBTCCAaugAwIBAgIUR+dm83drkiPhXocYvUVRx2UaomswCgYIKoZIzj0EAwIw
OTELMAkGA1UEBhMCSU4xEjAQBgNVBAoMCUFjbWUgQmFuazEWMBQGA1UEAwwNYXBp
LmFjbWUudGVzdDAeFw0yNjEwMjkwODEzMjdaFw0yNzEwMjkwODEzMjdaMDkxCzAJ
BgNVBAYTAklOMRIwEAYDVQQKDAlBY21lIEJhbmsxFjAUBgNVBAMMDWFwaS5hY21l
LnRlc3QwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAR9+lkj066C3py4Eg1IeB8I
ijLYcUxp0Pxq5X+n5kfNdKvnyoLoFvCljL+K0HnqUBhugrFP0GYQPlD+rJ0ZLqIO
o4GQMIGNMB0GA1UdDgQWBBSBEz5xqnd6s8dBsWeUPTGqmKo/+DAfBgNVHSMEGDAW
gBSBEz5xqnd6s8dBsWeUPTGqmKo/+DAPBgNVHRMBAf8EBTADAQH/MCUGA1UdEQQe
MByCDWFwaS5hY21lLnRlc3SCCyouYWNtZS50ZXN0MBMGA1UdJQQMMAoGCCsGAQUF
BwMBMAoGCCqGSM49BAMCA0gAMEUCIQD17A+AR+hGtoNdTFBMklw4eIvAoAXwZg+i
5RYWGvzFjgIgfpMJ/TlJYEp+pIhqAZLmxg0+logCwI8fGZvm3VOoQ+w=
-----END CERTIFICATE-----`;

// offset, depth, header length, length: from `openssl asn1parse -in cert.pem -i`
const OPENSSL = [[0, 0, 4, 517], [4, 1, 4, 427], [8, 2, 2, 3], [10, 3, 2, 1], [13, 2, 2, 20], [35, 2, 2, 10], [37, 3, 2, 8], [47, 2, 2, 57], [49, 3, 2, 11], [51, 4, 2, 9], [53, 5, 2, 3], [58, 5, 2, 2], [62, 3, 2, 18], [64, 4, 2, 16], [66, 5, 2, 3], [71, 5, 2, 9], [82, 3, 2, 22], [84, 4, 2, 20], [86, 5, 2, 3], [91, 5, 2, 13], [106, 2, 2, 30], [108, 3, 2, 13], [123, 3, 2, 13], [138, 2, 2, 57], [140, 3, 2, 11], [142, 4, 2, 9], [144, 5, 2, 3], [149, 5, 2, 2], [153, 3, 2, 18], [155, 4, 2, 16], [157, 5, 2, 3], [162, 5, 2, 9], [173, 3, 2, 22], [175, 4, 2, 20], [177, 5, 2, 3], [182, 5, 2, 13], [197, 2, 2, 89], [199, 3, 2, 19], [201, 4, 2, 7], [210, 4, 2, 8], [220, 3, 2, 66], [288, 2, 3, 144], [291, 3, 3, 141], [294, 4, 2, 29], [296, 5, 2, 3], [301, 5, 2, 22], [325, 4, 2, 31], [327, 5, 2, 3], [332, 5, 2, 24], [358, 4, 2, 15], [360, 5, 2, 3], [365, 5, 2, 1], [368, 5, 2, 5], [375, 4, 2, 37], [377, 5, 2, 3], [382, 5, 2, 30], [414, 4, 2, 19], [416, 5, 2, 3], [421, 5, 2, 12], [435, 1, 2, 10], [437, 2, 2, 8], [447, 1, 2, 72]];

describe("decodeDer", () => {
  it("matches openssl asn1parse node for node", () => {
    const nodes = flattenNodes(decodeDer(parseByteInput(CERT), false));
    expect(nodes.map((n) => [n.offset, n.depth, n.headerLength, n.length])).toEqual(OPENSSL);
  });
  it("decodes OIDs, strings, times and integers", () => {
    const nodes = flattenNodes(decodeDer(parseByteInput(CERT), false));
    const byOffset = new Map(nodes.map((n) => [n.offset, n]));
    expect(byOffset.get(37)!.value).toBe("1.2.840.10045.4.3.2 (ecdsa-with-SHA256)");
    expect(byOffset.get(91)!.value).toBe('"api.acme.test"');
    expect(byOffset.get(108)!.value).toBe("261029081327Z (2026-10-29 08:13:27 UTC)");
    expect(byOffset.get(10)!.value).toBe("2");
    expect(tagName(byOffset.get(288)!)).toBe("[3]");
    expect(byOffset.get(365)!.value).toBe("TRUE");
  });
  it("opens encapsulated extensions", () => {
    const nodes = flattenNodes(decodeDer(parseByteInput(CERT), true));
    const san = nodes.find((n) => n.offset === 382)!;
    expect(san.encapsulated).toBe(true);
    expect(flattenNodes(san.children).map((n) => n.value).filter(Boolean)).toEqual(["6170692E61636D652E74657374", "2A2E61636D652E74657374"]);
  });
  it("handles high tag numbers, negative integers, indefinite lengths and big OID arcs", () => {
    expect(decodeOid(Uint8Array.from([0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d]))).toBe("1.2.840.113549");
    expect(decodeOid(Uint8Array.from([0x88, 0x37]))).toBe("2.999");
    expect(decodeDer(Uint8Array.from([0x02, 0x01, 0xff]))[0]!.value).toBe("-1");
    expect(decodeDer(Uint8Array.from([0x9f, 0x81, 0x00, 0x00]))[0]!.tagNumber).toBe(128);
    const indef = decodeDer(Uint8Array.from([0x30, 0x80, 0x05, 0x00, 0x00, 0x00]))[0]!;
    expect(indef.children.map(tagName)).toEqual(["NULL"]);
    expect(indef.length).toBe(4);
  });
  it("reports truncated data", () => {
    expect(() => decodeDer(Uint8Array.from([0x30, 0x05, 0x02]))).toThrow(/runs past the end/);
  });
});

describe("runAsn1DerDecoder", () => {
  it("prints an indented tree with offsets", () => {
    const out = runAsn1DerDecoder(CERT, { inputMode: "auto", decodeEncapsulated: true, showOffsets: true }).output;
    expect(out).toContain("    0 4+517   SEQUENCE (3 items)");
    expect(out).toMatch(/\n {3}53 2\+3 {15}OBJECT IDENTIFIER 2\.5\.4\.6 \(countryName\)\n/);
    expect(out).toContain("OCTET STRING (encapsulates)");
    expect(runAsn1DerDecoder("3003020105", { inputMode: "hex", decodeEncapsulated: true, showOffsets: false }).output).toBe("SEQUENCE (1 item)\n  INTEGER 5");
  });
  it("explains bad input", () => {
    expect(runAsn1DerDecoder("zz", { inputMode: "hex", decodeEncapsulated: true, showOffsets: true }).error?.message).toContain("non-hex");
  });
});
