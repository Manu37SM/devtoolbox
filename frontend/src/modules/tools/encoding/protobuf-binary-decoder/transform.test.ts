import { describe, expect, it } from "vitest";
import { hexToBytes } from "@/lib/byte-input";
import { decodeMessage, runProtobufBinaryDecoder } from "./transform";
import type { ProtobufBinaryDecoderOptions } from "./schema";

const opts: ProtobufBinaryDecoderOptions = { inputMode: "auto", showAlternatives: false, grpcFrame: false };
const run = (hex: string, o: Partial<ProtobufBinaryDecoderOptions> = {}) => runProtobufBinaryDecoder(hex, { ...opts, ...o }).output.split("\n\n")[0];

describe("protobuf encoding guide examples", () => {
  it("varint 150 (Test1)", () => expect(run("089601")).toBe("1: 150"));
  it("string (Test2)", () => expect(run("120774657374696e67")).toBe('2: "testing"'));
  it("embedded message (Test3)", () => expect(run("1a03089601")).toBe("3: {\n  1: 150\n}"));
  it("packed repeated (Test4)", () => {
    const out = runProtobufBinaryDecoder("2206038e029ea705", { ...opts, showAlternatives: true }).output;
    expect(out).toContain("4: bytes[6] 03 8E 02 9E A7 05  (packed varints: 3, 270, 86942)");
  });
});

describe("decodeMessage", () => {
  it("reads fixed-width fields, negatives and zigzag", () => {
    const f = decodeMessage(hexToBytes("09000000000000f03f" + "1500002040" + "18ffffffffffffffffff01" + "2003"));
    expect(f.map((x) => [x.field, x.value.kind])).toEqual([[1, "i64"], [2, "i32"], [3, "varint"], [4, "varint"]]);
    const out = runProtobufBinaryDecoder("09000000000000f03f1500002040" + "18ffffffffffffffffff01" + "2003", { ...opts, showAlternatives: true }).output;
    expect(out).toContain("1: fixed64 4607182418800017408  (sfixed64 4607182418800017408, double 1)");
    expect(out).toContain("2: fixed32 1075838976  (sfixed32 1075838976, float 2.5)");
    expect(out).toContain("3: 18446744073709551615  (int64 -1, sint -9223372036854775808)");
    expect(out).toContain("4: 3  (sint -2)");
  });
  it("decodes groups and rejects invalid data", () => {
    expect(run("0b08010c")).toBe("1: group {\n  1: 1\n}");
    expect(runProtobufBinaryDecoder("0f", opts).error?.message).toContain("Invalid wire type 7");
    expect(runProtobufBinaryDecoder("1205aa", opts).error?.message).toContain("runs past the end");
  });
  it("strips a gRPC frame", () => {
    expect(run("0000000003089601", { grpcFrame: true })).toBe("1: 150");
  });
});

describe("group errors", () => {
  it("rejects a mismatched end-group", () => {
    expect(runProtobufBinaryDecoder("0b08011c", opts).error?.message).toContain("Unexpected end-group for field 3");
  });
});
