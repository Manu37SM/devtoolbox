import { describe, expect, it } from "vitest";
import { parseCookieHeader, parseCookies, parseSetCookie } from "./transform";

const o = { mode: "auto", decode: true } as const;

describe("parseCookieHeader", () => {
  it("splits pairs, keeping '=' inside values", () => {
    expect(parseCookieHeader("Cookie: a=1; b=x=y;  c=")).toEqual([["a", "1"], ["b", "x=y"], ["c", ""]]);
  });
});

describe("parseSetCookie", () => {
  it("parses attributes case-insensitively and survives the comma/semicolon in Expires", () => {
    const c = parseSetCookie("sid=abc; Path=/; Expires=Wed, 21 Oct 2026 07:28:00 GMT; Secure; HttpOnly; SameSite=Strict")!;
    expect(c.attrs).toMatchObject({ path: "/", expires: "Wed, 21 Oct 2026 07:28:00 GMT", secure: true, httponly: true, samesite: "Strict" });
    expect(c.warnings).toEqual([]);
  });
  it("warns about missing protections", () => {
    expect(parseSetCookie("a=b")!.warnings).toEqual(expect.arrayContaining([expect.stringContaining("Secure"), expect.stringContaining("HttpOnly"), expect.stringContaining("SameSite"), expect.stringContaining("session cookie")]));
  });
  it("checks SameSite=None and name prefixes", () => {
    expect(parseSetCookie("a=b; SameSite=None; HttpOnly")!.warnings.join()).toContain("SameSite=None requires Secure");
    expect(parseSetCookie("__Host-a=b; Secure; Domain=x.test; Path=/")!.warnings.join()).toContain("__Host-");
    expect(parseSetCookie("__Secure-a=b")!.warnings.join()).toContain("__Secure-");
    expect(parseSetCookie("a=b; Max-Age=soon")!.warnings.join()).toContain("not a number");
  });
  it("returns null without name=value", () => {
    expect(parseSetCookie("Secure; HttpOnly")).toBeNull();
  });
});

describe("parseCookies", () => {
  it("auto-detects Cookie vs Set-Cookie and URL-decodes values", () => {
    const out = parseCookies("Cookie: name=J%C3%BCrgen; theme=dark\nSet-Cookie: id=1; Secure; HttpOnly; SameSite=Lax; Max-Age=60", o).output;
    expect(out).toContain("name = Jürgen");
    expect(out).toContain("Set-Cookie  id");
    expect(out).not.toContain("review:");
  });
  it("can leave values encoded and force a mode", () => {
    expect(parseCookies("a=%41", { mode: "cookie", decode: false }).output).toContain("a = %41");
    expect(parseCookies("a=b", { mode: "set-cookie", decode: true }).output).toContain("Set-Cookie  a");
  });
  it("reports invalid Set-Cookie lines and empty input", () => {
    expect(parseCookies("Set-Cookie: Secure", o).error?.line).toBe(1);
    expect(parseCookies("", o)).toEqual({ output: "", error: null });
  });
});
