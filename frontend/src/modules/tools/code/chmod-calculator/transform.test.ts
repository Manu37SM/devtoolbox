import { describe, expect, it } from "vitest";
import { applySymbolic, convertChmod, fromOctal, parseChmod, symbolicClauses, toOctal, toSymbolic } from "./transform";

describe("octal <-> symbolic", () => {
  it.each([
    ["755", "rwxr-xr-x"], ["644", "rw-r--r--"], ["600", "rw-------"], ["000", "---------"],
    ["4755", "rwsr-xr-x"], ["4644", "rwSr--r--"], ["2750", "rwxr-s---"], ["1777", "rwxrwxrwt"], ["1666", "rw-rw-rwT"],
  ])("%s <-> %s", (octal, sym) => {
    const mode = fromOctal(octal);
    expect(toSymbolic(mode)).toBe(sym);
    expect(toOctal(parseChmod(sym, "000"))).toBe(octal.length === 3 ? `0${octal}` : octal);
  });

  it("accepts ls -l style strings with a file-type prefix", () => {
    expect(toOctal(parseChmod("drwxr-xr-x", "000"))).toBe("0755");
    expect(toOctal(parseChmod("-rw-r--r--", "000"))).toBe("0644");
  });
});

describe("applySymbolic", () => {
  const m = (o: string) => fromOctal(o);
  it("adds, removes and sets", () => {
    expect(toOctal(applySymbolic("u+x", m("644")))).toBe("0744");
    expect(toOctal(applySymbolic("go-rwx", m("755")))).toBe("0700");
    expect(toOctal(applySymbolic("a=r", m("755")))).toBe("0444");
    expect(toOctal(applySymbolic("u=rwx,g=rx,o=", m("000")))).toBe("0750");
    expect(toOctal(applySymbolic("+x", m("644")))).toBe("0755");
  });
  it("copies permissions from another class", () => {
    expect(toOctal(applySymbolic("g=u", m("700")))).toBe("0770");
  });
  it("handles setuid, setgid and sticky", () => {
    expect(toOctal(applySymbolic("u+s", m("755")))).toBe("4755");
    expect(toOctal(applySymbolic("g+s", m("750")))).toBe("2750");
    expect(toOctal(applySymbolic("+t", m("777")))).toBe("1777");
    expect(toOctal(applySymbolic("u-s", m("4755")))).toBe("0755");
  });
  it("X only adds execute when some class already has it", () => {
    expect(toOctal(applySymbolic("a+X", m("644")))).toBe("0644");
    expect(toOctal(applySymbolic("a+X", m("744")))).toBe("0755");
  });
  it("rejects malformed clauses", () => {
    expect(() => applySymbolic("u+q", m("644"))).toThrow();
    expect(() => applySymbolic("hello", m("644"))).toThrow();
  });
});

describe("symbolicClauses", () => {
  it("round-trips through applySymbolic", () => {
    for (const o of ["755", "4755", "2750", "1777", "000"]) {
      expect(toOctal(applySymbolic(symbolicClauses(fromOctal(o)), fromOctal("000")))).toBe(toOctal(fromOctal(o)));
    }
  });
});

describe("convertChmod", () => {
  it("renders a readable report with both commands", () => {
    const out = convertChmod("755", { current: "644" }).output;
    expect(out).toContain("Octal:     0755");
    expect(out).toContain("Symbolic:  rwxr-xr-x");
    expect(out).toContain("owner  7  read, write, execute");
    expect(out).toContain("chmod 755 file");
    expect(out).toContain("chmod u=rwx,g=rx,o=rx file");
  });
  it("uses the starting mode for relative changes and mentions special bits", () => {
    expect(convertChmod("u+x", { current: "644" }).output).toContain("Octal:     0744");
    expect(convertChmod("4755", { current: "644" }).output).toContain("setuid");
  });
  it("reports errors and handles empty input", () => {
    expect(convertChmod("nonsense", { current: "644" }).error).not.toBeNull();
    expect(convertChmod("", { current: "644" })).toEqual({ output: "", error: null });
  });
});
