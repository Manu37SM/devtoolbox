import { describe, expect, it } from "vitest";
import { convertDateFormat, emit, parseJava, parseMoment, parseOracle, parseStrftime, renderSample } from "./transform";

const conv = (p: string, from: "java" | "strftime" | "moment" | "oracle") => ({
  java: emit(from === "java" ? parseJava(p) : from === "strftime" ? parseStrftime(p) : from === "moment" ? parseMoment(p) : parseOracle(p), "java").text,
  strftime: emit(from === "java" ? parseJava(p) : from === "strftime" ? parseStrftime(p) : from === "moment" ? parseMoment(p) : parseOracle(p), "strftime").text,
  moment: emit(from === "java" ? parseJava(p) : from === "strftime" ? parseStrftime(p) : from === "moment" ? parseMoment(p) : parseOracle(p), "moment").text,
  oracle: emit(from === "java" ? parseJava(p) : from === "strftime" ? parseStrftime(p) : from === "moment" ? parseMoment(p) : parseOracle(p), "oracle").text,
});

describe("Java → everything", () => {
  it("handles the everyday pattern", () => {
    expect(conv("yyyy-MM-dd HH:mm:ss", "java")).toEqual({ java: "yyyy-MM-dd HH:mm:ss", strftime: "%Y-%m-%d %H:%M:%S", moment: "YYYY-MM-DD HH:mm:ss", oracle: "YYYY-MM-DD HH24:MI:SS" });
  });
  it("handles ISO-8601 with quoted T, millis and offset", () => {
    expect(conv("yyyy-MM-dd'T'HH:mm:ss.SSSXXX", "java")).toEqual({
      java: "yyyy-MM-dd'T'HH:mm:ss.SSSXXX", strftime: "%Y-%m-%dT%H:%M:%S.%L%:z", moment: "YYYY-MM-DD[T]HH:mm:ss.SSSZ", oracle: 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM',
    });
  });
  it("handles names, 12-hour clock and AM/PM", () => {
    expect(conv("EEEE, MMMM d, yyyy h:mm a", "java")).toEqual({
      java: "EEEE, MMMM d, yyyy h:mm a", strftime: "%A, %B %-d, %Y %-I:%M %p", moment: "dddd, MMMM D, YYYY h:mm A", oracle: "Day, Month FMDDFM, YYYY FMHH12FM:MI AM",
    });
  });
  it("treats '' as a literal apostrophe and quoted text as literal", () => {
    expect(parseJava("''yy 'o''clock'")).toEqual([{ k: "lit", v: "'" }, { k: "unit", u: "Y2" }, { k: "lit", v: " " }, { k: "lit", v: "o'clock" }]);
    expect(emit(parseJava("yyyy 'at' HH"), "oracle").text).toBe('YYYY "at" HH24');
  });
  it("rejects unsupported letters and unterminated quotes", () => {
    expect(() => parseJava("yyyy QQ")).toThrow(/Unsupported Java pattern letter "Q"/);
    expect(() => parseJava("yyyy 'oops")).toThrow(/Unterminated/);
  });
});

describe("strftime", () => {
  it("expands %F %T and escapes %%", () => {
    expect(conv("%F %T", "strftime").java).toBe("yyyy-MM-dd HH:mm:ss");
    expect(emit(parseStrftime("100%% %Y"), "java").text).toBe("100% yyyy");
    expect(emit([{ k: "lit", v: "50%" }], "strftime").text).toBe("50%%");
  });
  it("understands GNU no-pad flags and %f/%L", () => {
    expect(conv("%-d/%-m/%Y %f", "strftime")).toMatchObject({ java: "d/M/yyyy SSSSSS", oracle: "FMDDFM/FMMMFM/YYYY FF6" });
    expect(emit(parseStrftime("%L"), "java").text).toBe("SSS");
  });
  it("rejects unknown directives", () => {
    expect(() => parseStrftime("%Q")).toThrow(/Unsupported strftime directive/);
    expect(() => parseStrftime("abc%")).toThrow(/lone/);
  });
});

describe("Moment/Day.js and Oracle parsers", () => {
  it("parses Moment brackets and tokens", () => {
    expect(conv("DD/MM/YYYY [at] HH:mm", "moment").java).toBe("dd/MM/yyyy 'at' HH:mm");
    expect(() => parseMoment("YYYY Q")).toThrow(/Unsupported Moment/);
    expect(() => parseMoment("[open")).toThrow(/Unterminated/);
  });
  it("parses Oracle elements case-insensitively, including FF and quoted text", () => {
    expect(conv("dd-mon-yyyy hh24:mi:ss.ff3", "oracle")).toMatchObject({ java: "dd-MMM-yyyy HH:mm:ss.SSS", moment: "DD-MMM-YYYY HH:mm:ss.SSS" });
    expect(conv('YYYY"T"HH24', "oracle").java).toBe("yyyy'T'HH");
    expect(emit(parseOracle("FF"), "java").text).toBe("SSSSSS");
    expect(() => parseOracle("YYYY QQ")).toThrow(/Unsupported Oracle/);
  });
  it("Oracle HH means 12-hour", () => {
    expect(conv("HH:MI AM", "oracle").java).toBe("hh:mm a");
  });
});

describe("renderSample", () => {
  it("renders a fixed sample instant so you can sanity check the mapping", () => {
    expect(renderSample(parseJava("yyyy-MM-dd HH:mm:ss"))).toBe("2026-03-07 14:05:09");
    expect(renderSample(parseJava("EEEE d MMMM yy h:mm a"))).toBe("Saturday 7 March 26 2:05 PM");
    expect(renderSample(parseJava("DDD SSS XXX"))).toBe("066 123 +05:30");
  });
});

describe("convertDateFormat", () => {
  const o = { from: "java", showSample: true } as const;
  it("prints every dialect, the sample and relevant notes", () => {
    const out = convertDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS", o).output;
    expect(out).toContain("sample    2026-03-07T14:05:09.123");
    expect(out).toContain("strftime     %Y-%m-%dT%H:%M:%S.%L");
    expect(out).toContain("Oracle       YYYY-MM-DD\"T\"HH24:MI:SS.FF3");
    expect(out).toContain("← source (normalised)");
    expect(out).toContain("%L (milliseconds)");
  });
  it("warns about YYYY week-year only when emitting Java from another dialect", () => {
    expect(convertDateFormat("%Y", { from: "strftime", showSample: false }).output).toContain("avoid YYYY");
  });
  it("can hide the sample, handles several lines and reports the bad line", () => {
    expect(convertDateFormat("yyyy", { ...o, showSample: false }).output).not.toContain("sample");
    expect(convertDateFormat("yyyy\nQQ", o).error?.line).toBe(2);
    expect(convertDateFormat("  ", o)).toEqual({ output: "", error: null });
  });
});
