import { describe, expect, it } from "vitest";
import { inspect, runAnsi, stripAnsi, toHtml } from "./transform";

const E = String.fromCharCode(27);
const o = { mode: "strip" as const, stripCarriageReturns: true };

describe("stripAnsi", () => {
  it("removes colors, cursor movement and OSC sequences", () => {
    expect(stripAnsi(`${E}[31mred${E}[0m plain ${E}[1;32mgreen${E}[0m`)).toBe("red plain green");
    expect(stripAnsi(`${E}[2K${E}[1Gprogress`)).toBe("progress");
    expect(stripAnsi(`${E}]0;title\x07text`)).toBe("text");
    expect(stripAnsi(`${E}]8;;https://x.io${E}\\link${E}]8;;${E}\\`)).toBe("link");
  });
  it("leaves normal text alone", () => {
    expect(stripAnsi("[31m not an escape")).toBe("[31m not an escape");
  });
});

describe("runAnsi", () => {
  it("handles escapes pasted as literals", () => {
    expect(runAnsi("\\x1b[31mred\\x1b[0m", o).output).toBe("red");
    expect(runAnsi("\\033[1mbold\\033[0m ^[[32mgreen\\e[0m", o).output).toBe("bold green");
  });
  it("normalizes CRLF", () => {
    expect(runAnsi("a\r\nb", o).output).toBe("a\nb");
  });
  it("renders HTML with styles and escapes markup", () => {
    const h = toHtml(`${E}[1;31m<b>${E}[0m ok`);
    expect(h).toBe('<span style="font-weight:bold;color:#c33">&lt;b&gt;</span> ok');
    expect(toHtml(`${E}[38;2;1;2;3mx${E}[0m`)).toContain("color:rgb(1,2,3)");
    expect(toHtml(`${E}[38;5;196mx`)).toContain("rgb(");
  });
  it("inspects sequences", () => {
    const r = inspect(`${E}[31mx${E}[0m${E}[31my${E}[2K`);
    expect(r).toContain("4 escape sequence(s), 3 distinct");
    expect(r).toContain("2×");
    expect(r).toContain("fg 31");
    expect(r).toContain("erase line");
    expect(inspect("plain")).toMatch(/No ANSI/);
  });
});
