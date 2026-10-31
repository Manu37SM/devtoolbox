import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { acceptHeaderNegotiator as fn, negotiate, parseAccept, rank } from "./transform";

describe("parse and rank", () => {
  it("orders by q, then specificity, then position", () => {
    const r = rank(parseAccept("text/*, text/html;level=1, */*;q=0.1, text/html, application/json;q=0.5", "accept"), "accept");
    expect(r.map((e) => e.value + (e.params.length ? "+p" : ""))).toEqual(["text/html+p", "text/html", "text/*", "application/json", "*/*"]);
  });
  it("keeps params before q as range params and after q as extensions", () => {
    const [e] = parseAccept('text/html;level=1;q=0.7;ext="a b"', "accept");
    expect(e!.params).toEqual([["level", "1"]]);
    expect(e!.ext).toEqual([["ext", "a b"]]);
    expect(e!.q).toBe(0.7);
  });
  it("commas inside quoted parameters do not split entries", () => {
    expect(parseAccept('text/html;foo="a,b", text/plain', "accept")).toHaveLength(2);
  });
  it("warns on out-of-grammar q values", () => {
    expect(parseAccept("text/html;q=1.5", "accept")[0]!.warnings[0]).toMatch(/clamped/);
    expect(parseAccept("text/html;q=abc", "accept")[0]!.q).toBe(1);
    expect(parseAccept("text/html;q=0.12345", "accept")[0]!.warnings.length).toBe(1);
  });
});

describe("media type negotiation (RFC 9110 12.5.1)", () => {
  const n = (h: string, o: string[]) => negotiate(h, o, "accept").chosen;
  it("the most specific range decides q", () => {
    // RFC example: text/html;level=1 q=1, text/html q=0.7, text/plain q=0.3
    const h = "text/*;q=0.3, text/plain;q=0.7, text/plain;format=flowed, text/plain;format=fixed;q=0.4, */*;q=0.5";
    const v = negotiate(h, ["text/plain;format=flowed", "text/plain;format=fixed", "text/plain", "text/html", "image/jpeg"], "accept").verdicts;
    expect(v.map((x) => x.q)).toEqual([1, 0.4, 0.7, 0.3, 0.5]);
  });
  it("ties go to the server's order", () => {
    expect(n("*/*", ["text/html", "application/json"])).toBe("text/html");
    expect(n("*/*", ["application/json", "text/html"])).toBe("application/json");
  });
  it("q=0 excludes a type even when */* would accept it", () => {
    expect(n("text/html;q=0, */*", ["text/html", "application/json"])).toBe("application/json");
    expect(n("text/html;q=0", ["text/html"])).toBeNull();
  });
  it("no header means anything", () => {
    expect(n("", ["a/b"])).toBe("a/b");
  });
  it("unmatched yields 406 text", () => {
    const r = fn("image/png", { offered: "application/json" });
    expect(r.output).toContain("406 Not Acceptable");
  });
});

describe("language / encoding / charset", () => {
  it("basic filtering: en matches en-GB but en-GB does not match en", () => {
    expect(negotiate("en", ["en-GB"], "language").chosen).toBe("en-GB");
    expect(negotiate("en-GB", ["en"], "language").chosen).toBeNull();
    expect(negotiate("fr;q=0.9, en;q=0.8, *;q=0.1", ["de", "en-US", "fr-CA"], "language").chosen).toBe("fr-CA");
  });
  it("longest matching range wins", () => {
    const v = negotiate("en;q=0.2, en-US;q=0.9", ["en-US", "en-GB"], "language").verdicts;
    expect(v.map((x) => x.q)).toEqual([0.9, 0.2]);
  });
  it("identity is acceptable unless refused", () => {
    expect(negotiate("gzip", ["identity"], "encoding").chosen).toBe("identity");
    expect(negotiate("gzip, identity;q=0", ["identity"], "encoding").chosen).toBeNull();
    expect(negotiate("*;q=0", ["identity"], "encoding").chosen).toBeNull();
    expect(negotiate("gzip;q=1, br;q=0.8", ["br", "gzip"], "encoding").chosen).toBe("gzip");
  });
  it("charset exact or wildcard", () => {
    expect(negotiate("utf-8, iso-8859-1;q=0.5", ["iso-8859-1", "utf-8"], "charset").chosen).toBe("utf-8");
  });
});

describe("wrapper", () => {
  it("strips a header name prefix and joins folded lines", () => {
    const r = fn("Accept: text/html,\n  application/json;q=0.9", { mode: "parse" });
    expect(r.output).toContain("text/html");
    expect(r.output).toContain("application/json");
  });
  it("prints Vary and Content-Type hints", () => {
    const r = fn("application/json", { offered: "application/json, text/html" });
    expect(r.output).toContain("Vary: Accept");
    expect(r.output).toContain("Content-Type: application/json");
  });
  it("requires an offered list in negotiate mode", () => {
    expect(fn("text/html", { offered: "" }).error).not.toBeNull();
  });
});

const probe = spawnSync("python3", ["-c", "from werkzeug.datastructures import MIMEAccept"], { encoding: "utf8" });
describe.skipIf(probe.status !== 0)("agrees with werkzeug MIMEAccept.best_match", () => {
  it("on a set of headers", () => {
    const headers = [
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "application/json",
      "text/*;q=0.5, application/json;q=0.4",
      "image/webp,image/*;q=0.8,*/*;q=0.1",
      "application/xml;q=0.9, application/json;q=0.9",
      "text/html;q=0.3, text/plain;q=0.9, */*;q=0.1",
      "application/json;q=0, */*;q=0.2",
    ];
    const offers = [["application/json", "text/html"], ["text/html", "application/json", "application/xml"], ["image/png", "image/webp"], ["text/plain", "text/html"], ["application/xml", "application/json"]];
    const script = `import json,sys\nfrom werkzeug.datastructures import MIMEAccept\nfrom werkzeug.http import parse_accept_header\nd=json.load(sys.stdin)\nout=[]\nfor h in d['h']:\n  a=parse_accept_header(h,MIMEAccept)\n  out.append([a.best_match(o) for o in d['o']])\nprint(json.dumps(out))`;
    const r = spawnSync("python3", ["-c", script], { input: JSON.stringify({ h: headers, o: offers }), encoding: "utf8" });
    const want = JSON.parse(r.stdout) as Array<Array<string | null>>;
    headers.forEach((h, i) => offers.forEach((o, j) => expect(negotiate(h, o, "accept").chosen, `${h} vs ${o.join()}`).toBe(want[i]![j])));
  });
});
