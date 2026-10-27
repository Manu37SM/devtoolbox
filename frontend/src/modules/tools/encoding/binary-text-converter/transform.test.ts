import { describe, expect, it } from "vitest";
import { convertBinaryText } from "./transform";

const enc = (base: "2" | "8" | "10") => ({ mode: "encode", base }) as const;
const dec = (base: "2" | "8" | "10") => ({ mode: "decode", base }) as const;

describe("convertBinaryText", () => {
  it("encodes to padded binary, octal and decimal", () => {
    expect(convertBinaryText("Hi", enc("2")).output).toBe("01001000 01101001");
    expect(convertBinaryText("Hi", enc("8")).output).toBe("110 151");
    expect(convertBinaryText("Hi", enc("10")).output).toBe("72 105");
  });
  it("encodes multi-byte UTF-8", () => {
    expect(convertBinaryText("é", enc("10")).output).toBe("195 169");
    expect(convertBinaryText("€", enc("2")).output.split(" ")).toHaveLength(3);
  });
  it("round-trips through every base", () => {
    for (const b of ["2", "8", "10"] as const) {
      const e = convertBinaryText("Zoë 日本 🔑", enc(b)).output;
      expect(convertBinaryText(e, dec(b)).output).toBe("Zoë 日本 🔑");
    }
  });
  it("decodes comma or space separated input", () => {
    expect(convertBinaryText("72,105", dec("10")).output).toBe("Hi");
    expect(convertBinaryText("01001000\n01101001", dec("2")).output).toBe("Hi");
  });
  it("rejects bad tokens, oversize bytes and invalid UTF-8", () => {
    expect(convertBinaryText("0102", dec("2")).error?.message).toMatch(/not a valid base-2/);
    expect(convertBinaryText("256", dec("10")).error?.message).toMatch(/larger than one byte/);
    expect(convertBinaryText("777", dec("8")).error?.message).toMatch(/larger than one byte/);
    expect(convertBinaryText("255", dec("10")).error?.message).toMatch(/UTF-8/);
    expect(convertBinaryText("", enc("2"))).toEqual({ output: "", error: null });
  });
});
