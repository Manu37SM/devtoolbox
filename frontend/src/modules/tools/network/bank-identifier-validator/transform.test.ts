import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { bankIdentifierValidator as v, checkAba, checkBic, checkIfsc, detect } from "./transform";

describe("BIC", () => {
  it("parses 8 and 11 characters", () => {
    const a = checkBic("DEUTDEFF");
    expect(a.valid).toBe(true);
    expect(a.details.join("\n")).toContain("Germany");
    expect(checkBic("DEUTDEFF500").valid).toBe(true);
  });
  it("flags test and passive BICs but still calls the structure valid", () => {
    expect(checkBic("DEUTDEF0").warnings.join(" ")).toMatch(/TEST BIC/);
    expect(checkBic("DEUTDEF1").warnings.join(" ")).toMatch(/passive/);
    expect(checkBic("DEUTDEFFXAB").warnings.join(" ")).toMatch(/reserved/);
  });
  it("rejects bad lengths, structure and countries", () => {
    expect(checkBic("DEUTDEF").valid).toBe(false);
    expect(checkBic("DEUT1EFF").valid).toBe(false);
    expect(checkBic("AAAAXX11").valid).toBe(false);
    expect(checkBic("DEUTXKFF").valid).toBe(true); // Kosovo is used in SWIFT despite not being ISO-assigned
  });
});
describe("ABA", () => {
  it("accepts real routing numbers", () => {
    for (const n of ["021000021", "011401533", "121000358", "322271627"]) expect(checkAba(n).valid, n).toBe(true);
  });
  it("rejects checksum errors with the right check digit", () => {
    const r = checkAba("021000022");
    expect(r.valid).toBe(false);
    expect(r.problems[0]).toContain("check digit should be 1");
  });
  it("reports the Fed district", () => {
    expect(checkAba("021000021").details.join("\n")).toContain("New York");
    expect(checkAba("121000358").details.join("\n")).toContain("San Francisco");
  });
});
describe("IFSC / sort code / BSB / transit", () => {
  it("IFSC", () => {
    expect(checkIfsc("SBIN0000001").details.join(" ")).toContain("State Bank of India");
    expect(checkIfsc("SBIN1000001").valid).toBe(false);
  });
  it("auto-detection", () => {
    expect(detect("DEUTDEFF")).toEqual(["bic"]);
    expect(detect("021000021")).toEqual(["aba"]);
    expect(detect("20-00-00")).toEqual(["sortcode", "bsb"]);
    expect(detect("HDFC0000001")).toEqual(["ifsc"]);
    expect(detect("12345-003")).toEqual(["ca-transit"]);
    expect(detect("hello")).toEqual([]);
  });
  it("formats", () => {
    expect(v("200000", { type: "sortcode" }).output).toContain("20-00-00");
    expect(v("062000", { type: "bsb" }).output).toContain("062-000");
    expect(v("12345-003", {}).output).toContain("Electronic format 000312345");
  });
  it("unknown input is reported, not thrown", () => {
    expect(v("???", {}).output).toContain("Could not tell");
    expect(v("", {}).output).toBe("");
  });
});

// Oracle: schwifty's BIC parser (structure + ISO country) on 600 random strings
const sch = spawnSync("python3", ["-c", "import schwifty"], { encoding: "utf8" }).status === 0;
describe.skipIf(!sch)("agrees with schwifty on BIC validity", () => {
  it("600 random candidates", () => {
    let s = 3;
    const rnd = (n: number) => ((s = (s * 1664525 + 1013904223) >>> 0) % n);
    const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ", A = L + "0123456789";
    const ctry = ["DE", "US", "GB", "IN", "FR", "XX", "ZZ", "AU", "CH", "JP", "QQ", "BR"];
    const cands = Array.from({ length: 600 }, () => {
      const base = Array.from({ length: 4 }, () => L[rnd(26)]).join("") + ctry[rnd(ctry.length)]! + Array.from({ length: 2 }, () => A[rnd(36)]).join("");
      const tail = [0, 3, 3, 1, 2][rnd(5)]!;
      return base + Array.from({ length: tail }, () => A[rnd(36)]).join("");
    });
    const script = `
import sys, json
from schwifty import BIC
out = []
for c in json.load(sys.stdin):
    try: BIC(c); out.append(True)
    except Exception: out.append(False)
print(json.dumps(out))`;
    const r = spawnSync("python3", ["-c", script], { input: JSON.stringify(cands), encoding: "utf8" });
    expect(r.status, r.stderr).toBe(0);
    const want = JSON.parse(r.stdout) as boolean[];
    cands.forEach((c, i) => expect(checkBic(c).valid, c).toBe(want[i]));
  });
});
