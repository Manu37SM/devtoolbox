import { describe, expect, it } from "vitest";
import { convertStorage, toBytes } from "./transform";

describe("toBytes", () => {
  it("separates decimal from binary prefixes", () => {
    expect(toBytes("1 KB")).toBe(1000);
    expect(toBytes("1 KiB")).toBe(1024);
    expect(toBytes("1 GiB")).toBe(1073741824);
    expect(toBytes("8 bit")).toBe(1);
    expect(toBytes("1,024 B")).toBe(1024);
    expect(toBytes("x")).toBeNull();
    expect(toBytes("5 toString")).toBeNull();
  });
});

describe("convertStorage", () => {
  it("shows both systems and the classic '1 TB drive is 931 GiB' gap", () => {
    const out = convertStorage("1 TB", { system: "both" }).output;
    expect(out).toMatch(/1000 GB/);
    expect(out).toMatch(/931\.32257 GiB/);
    expect(out).toMatch(/8e\+12 bits|8000000000000 bits/);
  });
  it("can show only one system", () => {
    const dec = convertStorage("2048 B", { system: "decimal" }).output;
    expect(dec).not.toContain("KiB");
    expect(dec).toContain("2.048 KB");
    expect(convertStorage("2048 B", { system: "binary" }).output).toContain("2 KiB");
  });
  it("reports bad lines", () => {
    expect(convertStorage("1 GB\nnope", { system: "both" }).error?.line).toBe(2);
    expect(convertStorage("", { system: "both" })).toEqual({ output: "", error: null });
  });
});
