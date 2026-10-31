import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { buildQuery, parseUpi, upiPaymentLinkBuilder as fn, validate } from "./transform";

describe("build", () => {
  it("canonical link, params in NPCI order, spaces as %20", () => {
    const r = fn("shop@okicici", { payeeName: "Blue Door Cafe", amount: "250.50", note: "Order #42", reference: "ORD42", targets: ["upi"] });
    expect(r.output).toContain("upi://pay?pa=shop%40okicici&pn=Blue%20Door%20Cafe&am=250.50&cu=INR&tn=Order%20%2342&tr=ORD42");
  });
  it("omits the amount when empty so the payer types it", () => {
    expect(fn("a.b@upi", { payeeName: "A", targets: ["upi"] }).output).not.toContain("am=");
  });
  it("all targets", () => {
    const out = fn("ab@upi", { payeeName: "A", amount: "1", targets: ["upi", "gpay", "phonepe", "paytm", "android-intent", "html", "qr-payload"] }).output;
    expect(out).toContain("gpay://upi/pay?pa=ab%40upi");
    expect(out).toContain("phonepe://pay?pa=ab%40upi");
    expect(out).toContain("paytmmp://pay?pa=ab%40upi");
    expect(out).toContain("#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end");
    expect(out).toContain('<a href="upi://pay?pa=ab%40upi&amp;pn=A&amp;am=1&amp;cu=INR">Pay ₹1 with UPI</a>');
  });
  it("rejects invalid fields", () => {
    expect(fn("no-at-sign", { payeeName: "A" }).error?.message).toMatch(/valid VPA/);
    expect(fn("ab@upi", { payeeName: "" }).error?.message).toMatch(/pn/);
    expect(fn("ab@upi", { payeeName: "A", amount: "12.345" }).error?.message).toMatch(/2 decimals/);
    expect(fn("ab@upi", { payeeName: "A", amount: "0" }).error?.message).toMatch(/greater than zero/);
    expect(fn("ab@upi", { payeeName: "A", merchantCode: "12" }).error?.message).toMatch(/4-digit/);
    expect(fn("ab@upi", { payeeName: "A", targets: ["android-intent"], androidPackage: "bad" }).error).not.toBeNull();
  });
  it("accepts amounts with thousands separators and warns above the limit", () => {
    const r = fn("ab@upi", { payeeName: "A", amount: "2,00,000", targets: ["upi"] });
    expect(r.output).toContain("am=200000");
    expect(r.output).toContain("warning: am is above");
  });
  it("warns about long notes, non-ASCII and merchant links without a reference", () => {
    const r = fn("ab@upi", { payeeName: "A", note: "é".repeat(60), merchantCode: "5812", targets: ["upi"] });
    expect(r.output).toContain("longer than 50");
    expect(r.output).toContain("non-ASCII");
    expect(r.output).toContain("transaction reference");
  });
});

describe("parse", () => {
  it("round trips", () => {
    const link = fn("shop@okicici", { payeeName: "Cafe & Bar", amount: "10", note: "x y", reference: "R1", merchantCode: "5812", targets: ["upi"] }).output.split("\n")[1]!;
    const p = parseUpi(link);
    expect(p).toMatchObject({ pa: "shop@okicici", pn: "Cafe & Bar", am: "10", cu: "INR", tn: "x y", tr: "R1", mc: "5812" });
    expect(buildQuery(p)).toBe(link.replace("upi://pay?", ""));
  });
  it("decodes + as space (some generators emit it) and reports problems", () => {
    const r = fn("upi://pay?pa=bad&pn=Some+Shop&am=5.123&cu=USD", { mode: "parse" });
    expect(r.output).toContain("Some Shop");
    expect(r.output).toContain("ERROR   pa");
    expect(r.output).toContain("2 decimals");
    expect(r.output).toContain("cu must be INR");
  });
  it("flags signed links", () => {
    expect(fn("upi://pay?pa=ab@upi&pn=A&sign=MEUCIQ", { mode: "parse" }).output).toContain("Link is signed");
  });
  it("rejects other inputs and bad escapes", () => {
    expect(fn("https://example.com", { mode: "parse" }).error).not.toBeNull();
    expect(fn("upi://pay?pa=ab@upi&pn=%E0%A4%A", { mode: "parse" }).error?.message).toMatch(/percent-encoding/);
  });
  it("validate() on a clean set", () => {
    expect(validate({ pa: "ab@upi", pn: "A", am: "1.5", cu: "INR" })).toEqual({ errors: [], warnings: [] });
  });
});

const py = spawnSync("python3", ["-c", "import urllib.parse"], { encoding: "utf8" });
describe.skipIf(py.status !== 0)("python urllib reads what we build", () => {
  it("parse_qs agrees on awkward values", () => {
    const vals = { pn: "Ünï & Co. (Pvt) Ltd; #1 = best?", tn: "50% off, 'quotes' \"dq\" a+b", tr: "R-1.2_3" };
    const link = fn("x.y-z@okaxis", { payeeName: vals.pn, note: vals.tn, reference: vals.tr, amount: "99.9", targets: ["upi"] }).output.split("\n")[1]!;
    const script = `import sys,json,urllib.parse as u\nq=u.urlsplit(sys.stdin.read().strip()).query\nprint(json.dumps(u.parse_qs(q,keep_blank_values=True,strict_parsing=True),ensure_ascii=False))`;
    const r = spawnSync("python3", ["-c", script], { input: link, encoding: "utf8" });
    const d = JSON.parse(r.stdout) as Record<string, string[]>;
    expect(d.pa).toEqual(["x.y-z@okaxis"]);
    expect(d.pn).toEqual([vals.pn]);
    expect(d.tn).toEqual([vals.tn]);
    expect(d.tr).toEqual([vals.tr]);
    expect(d.am).toEqual(["99.9"]);
  });
});
