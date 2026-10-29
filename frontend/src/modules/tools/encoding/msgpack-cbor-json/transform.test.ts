import { describe, expect, it } from "vitest";
import { parseJsonExact, runMsgpackCborJson } from "./transform";
import type { MsgpackCborJsonOptions } from "./schema";

const enc = (json: string, format: "msgpack" | "cbor") => runMsgpackCborJson(json, { format, direction: "encode", outputEncoding: "hex" }).output.replace(/ /g, "");
const dec = (hex: string, format: "msgpack" | "cbor") => JSON.parse(runMsgpackCborJson(hex, { format, direction: "decode", outputEncoding: "hex" }).output);

// [json, msgpack, cbor] from Python msgpack 1.x and cbor2
const VECTORS: [string, string, string][] = [
  ["0", "00", "00"], ["23", "17", "17"], ["24", "18", "1818"], ["100", "64", "1864"], ["1000", "cd03e8", "1903e8"],
  ["-1", "ff", "20"], ["-100", "d09c", "3863"], ["1.5", "cb3ff8000000000000", "fb3ff8000000000000"], ["1.1", "cb3ff199999999999a", "fb3ff199999999999a"],
  ['"a"', "a161", "6161"], ['"ü"', "a2c3bc", "62c3bc"], ["[1,[2,3]]", "9201920203", "8201820203"], ['{"a":1,"b":[2,3]}', "82a16101a162920203", "a26161016162820203"],
  ["true", "c3", "f5"], ["null", "c0", "f6"], ["4294967296", "cf0000000100000000", "1b0000000100000000"], ["-4294967296", "d3ffffffff00000000", "3affffffff"],
  ["9223372036854775807", "cf7fffffffffffffff", "1b7fffffffffffffff"], ['{"compact":true,"schema":0}', "82a7636f6d70616374c3a6736368656d6100", "a267636f6d70616374f566736368656d6100"],
];

describe("matches Python msgpack and cbor2", () => {
  for (const [json, mp, cb] of VECTORS) {
    it(json, () => {
      expect(enc(json, "msgpack")).toBe(mp);
      expect(enc(json, "cbor")).toBe(cb);
      const back = (hex: string, f: "msgpack" | "cbor") => runMsgpackCborJson(hex, { format: f, direction: "decode", outputEncoding: "hex" }).output.replace(/\s+/g, "");
      expect(back(mp, "msgpack")).toBe(json);
      expect(back(cb, "cbor")).toBe(json);
    });
  }
  it("encodes long strings and arrays with the wider headers", () => {
    expect(enc(JSON.stringify("x".repeat(40)), "msgpack")).toBe("d928" + "78".repeat(40));
    expect(enc(JSON.stringify("x".repeat(40)), "cbor")).toBe("7828" + "78".repeat(40));
    expect(enc(JSON.stringify(new Array(20).fill(null)), "msgpack")).toBe("dc0014" + "c0".repeat(20));
  });
});

describe("decoding extras", () => {
  it("handles CBOR half floats, tags, indefinite lengths, bytes and simple values", () => {
    expect(dec("f93e00", "cbor")).toBe(1.5);
    expect(dec("f97c00", "cbor")).toEqual({ $float: "Infinity" });
    expect(dec("f97e00", "cbor")).toEqual({ $float: "NaN" });
    expect(dec("c074323031332d30332d32315432303a30343a30305a", "cbor")).toEqual({ $tag: 0, value: "2013-03-21T20:04:00Z" });
    expect(dec("9f018202039f0405ffff", "cbor")).toEqual([1, [2, 3], [4, 5]]);
    expect(dec("bf61610161629f0203ffff", "cbor")).toEqual({ a: 1, b: [2, 3] });
    expect(dec("4401020304", "cbor")).toEqual({ $base64: "AQIDBA==" });
    expect(dec("f7", "cbor")).toEqual({ $undefined: true });
  });
  it("handles MessagePack bin, ext timestamps and integer keys", () => {
    expect(dec("c403010203", "msgpack")).toEqual({ $base64: "AQID" });
    expect(dec("d6ff5e0be100", "msgpack")).toEqual({ $timestamp: "2020-01-01T00:00:00Z" });
    expect(dec("81 01 a1 78", "msgpack")).toEqual({ "1": "x" });
  });
  it("keeps 64-bit integers exact", () => {
    expect(runMsgpackCborJson("cfffffffffffffffff", { format: "msgpack", direction: "decode", outputEncoding: "hex" }).output).toBe("18446744073709551615");
    expect(parseJsonExact("[18446744073709551615]")).toEqual([18446744073709551615n]);
  });
  it("round-trips bytes and tags when encoding", () => {
    expect(enc('{"$base64":"AQID"}', "msgpack")).toBe("c403010203");
    expect(enc('{"$tag":1,"value":1363896240}', "cbor")).toBe("c11a514b67b0");
  });
  it("reports truncated or invalid input", () => {
    expect(runMsgpackCborJson("92 01", { format: "msgpack", direction: "decode", outputEncoding: "hex" }).error?.message).toContain("Unexpected end of data");
    expect(runMsgpackCborJson("c1", { format: "msgpack", direction: "decode", outputEncoding: "hex" }).error?.message).toContain("Invalid MessagePack type byte 0xc1");
    expect(runMsgpackCborJson("{", { format: "cbor", direction: "encode", outputEncoding: "hex" }).error?.message).toContain("CBOR encoding failed");
  });
  it("outputs base64", () => {
    expect(runMsgpackCborJson("[1,2]", { format: "cbor", direction: "encode", outputEncoding: "base64" } as MsgpackCborJsonOptions).output).toBe("ggEC");
  });
});
