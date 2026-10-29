import { describe, expect, it } from "vitest";
import { convertLine, lettersToNumber, numberToLetters, runExcelColumnConverter } from "./transform";

describe("column letters", () => {
  it("round-trips the boundaries", () => {
    for (const [l, n] of [["A", 1], ["Z", 26], ["AA", 27], ["AZ", 52], ["BA", 53], ["ZZ", 702], ["AAA", 703], ["XFD", 16384]] as const) {
      expect(lettersToNumber(l)).toBe(n);
      expect(numberToLetters(n)).toBe(l);
    }
    expect(() => numberToLetters(0)).toThrow();
  });
});

describe("convertLine", () => {
  it("converts columns, cells and ranges", () => {
    expect(convertLine("28", false)).toBe("28 -> column AB");
    expect(convertLine("xfd", false)).toBe("XFD -> column 16384");
    expect(convertLine("B12", false)).toBe("B12 -> R12C2 | column 2, row 12");
    expect(convertLine("$C$5", false)).toBe("$C$5 -> R5C3 | column 3, row 5");
    expect(convertLine("R12C2", false)).toBe("R12C2 -> B12");
    expect(convertLine("Sheet 1!A1:C10", false)).toBe("Sheet 1!A1:C10 -> Sheet 1!R1C1:R10C3 | Sheet 1!A1:C10 | 10 rows x 3 columns = 30 cells");
  });
  it("supports 0-based indexes for code (Apache POI, openpyxl offsets)", () => {
    expect(convertLine("B12", true)).toBe("B12 -> R12C2 | column 2, row 12  (0-based: row 11, col 1)");
    expect(convertLine("0", true)).toBe("0 -> column A");
    expect(convertLine("C", true)).toBe("C -> column 2 (0-based)");
  });
  it("flags limits and relative references", () => {
    expect(convertLine("XFE1", false)).toContain("beyond Excel's limit");
    expect(convertLine("R[1]C[-2]", false)).toContain("relative R1C1 reference");
    expect(convertLine("hello world", false)).toContain("not a column");
  });
  it("runs line by line", () => {
    expect(runExcelColumnConverter("A\n\nB", { zeroBased: false }).output).toBe("A -> column 1\nB -> column 2");
  });
});
