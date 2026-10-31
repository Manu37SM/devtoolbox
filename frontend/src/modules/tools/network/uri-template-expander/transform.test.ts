import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { expandTemplate, parseTemplate, templateVariables, uriTemplateExpander as fn } from "./transform";

// RFC 6570 section 3.2 example variables (keys in the order the RFC lists them)
const V = {
  count: ["one", "two", "three"],
  dom: ["example", "com"],
  dub: "me/too",
  hello: "Hello World!",
  half: "50%",
  var: "value",
  who: "fred",
  base: "http://example.com/home/",
  path: "/foo/bar",
  list: ["red", "green", "blue"],
  keys: { semi: ";", dot: ".", comma: "," },
  v: "6",
  x: "1024",
  y: "768",
  empty: "",
  emptyKeys: [],
};

const RFC: Array<[string, string]> = [
  ["{count}", "one,two,three"],
  ["{count*}", "one,two,three"],
  ["{/count}", "/one,two,three"],
  ["{/count*}", "/one/two/three"],
  ["{;count}", ";count=one,two,three"],
  ["{;count*}", ";count=one;count=two;count=three"],
  ["{?count}", "?count=one,two,three"],
  ["{?count*}", "?count=one&count=two&count=three"],
  ["{&count*}", "&count=one&count=two&count=three"],
  ["{var}", "value"],
  ["{hello}", "Hello%20World%21"],
  ["{half}", "50%25"],
  ["O{empty}X", "OX"],
  ["O{undef}X", "OX"],
  ["{x,y}", "1024,768"],
  ["{x,hello,y}", "1024,Hello%20World%21,768"],
  ["?{x,empty}", "?1024,"],
  ["?{x,undef}", "?1024"],
  ["?{undef,y}", "?768"],
  ["{var:3}", "val"],
  ["{var:30}", "value"],
  ["{list}", "red,green,blue"],
  ["{list*}", "red,green,blue"],
  ["{keys}", "semi,%3B,dot,.,comma,%2C"],
  ["{keys*}", "semi=%3B,dot=.,comma=%2C"],
  ["{+var}", "value"],
  ["{+hello}", "Hello%20World!"],
  ["{+half}", "50%25"],
  ["{base}index", "http%3A%2F%2Fexample.com%2Fhome%2Findex"],
  ["{+base}index", "http://example.com/home/index"],
  ["O{+empty}X", "OX"],
  ["O{+undef}X", "OX"],
  ["{+path}/here", "/foo/bar/here"],
  ["here?ref={+path}", "here?ref=/foo/bar"],
  ["up{+path}{var}/here", "up/foo/barvalue/here"],
  ["{+x,hello,y}", "1024,Hello%20World!,768"],
  ["{+path,x}/here", "/foo/bar,1024/here"],
  ["{+path:6}/here", "/foo/b/here"],
  ["{+list}", "red,green,blue"],
  ["{+list*}", "red,green,blue"],
  ["{+keys}", "semi,;,dot,.,comma,,"],
  ["{+keys*}", "semi=;,dot=.,comma=,"],
  ["{#var}", "#value"],
  ["{#hello}", "#Hello%20World!"],
  ["{#half}", "#50%25"],
  ["foo{#empty}", "foo#"],
  ["foo{#undef}", "foo"],
  ["{#x,hello,y}", "#1024,Hello%20World!,768"],
  ["{#path,x}/here", "#/foo/bar,1024/here"],
  ["{#path:6}/here", "#/foo/b/here"],
  ["{#list}", "#red,green,blue"],
  ["{#list*}", "#red,green,blue"],
  ["{#keys}", "#semi,;,dot,.,comma,,"],
  ["{#keys*}", "#semi=;,dot=.,comma=,"],
  ["{.who}", ".fred"],
  ["{.who,who}", ".fred.fred"],
  ["{.half,who}", ".50%25.fred"],
  ["www{.dom*}", "www.example.com"],
  ["X{.var}", "X.value"],
  ["X{.empty}", "X."],
  ["X{.undef}", "X"],
  ["X{.var:3}", "X.val"],
  ["X{.list}", "X.red,green,blue"],
  ["X{.list*}", "X.red.green.blue"],
  ["X{.keys}", "X.semi,%3B,dot,.,comma,%2C"],
  ["X{.keys*}", "X.semi=%3B.dot=..comma=%2C"],
  ["X{.empty_keys}", "X"],
  ["X{.empty_keys*}", "X"],
  ["{/who}", "/fred"],
  ["{/who,who}", "/fred/fred"],
  ["{/half,who}", "/50%25/fred"],
  ["{/who,dub}", "/fred/me%2Ftoo"],
  ["{/var}", "/value"],
  ["{/var,empty}", "/value/"],
  ["{/var,undef}", "/value"],
  ["{/var,x}/here", "/value/1024/here"],
  ["{/var:1,var}", "/v/value"],
  ["{/list}", "/red,green,blue"],
  ["{/list*}", "/red/green/blue"],
  ["{/list*,path:4}", "/red/green/blue/%2Ffoo"],
  ["{/keys}", "/semi,%3B,dot,.,comma,%2C"],
  ["{/keys*}", "/semi=%3B/dot=./comma=%2C"],
  ["{;who}", ";who=fred"],
  ["{;half}", ";half=50%25"],
  ["{;empty}", ";empty"],
  ["{;v,empty,who}", ";v=6;empty;who=fred"],
  ["{;v,bar,who}", ";v=6;who=fred"],
  ["{;x,y}", ";x=1024;y=768"],
  ["{;x,y,empty}", ";x=1024;y=768;empty"],
  ["{;x,y,undef}", ";x=1024;y=768"],
  ["{;hello:5}", ";hello=Hello"],
  ["{;list}", ";list=red,green,blue"],
  ["{;list*}", ";list=red;list=green;list=blue"],
  ["{;keys}", ";keys=semi,%3B,dot,.,comma,%2C"],
  ["{;keys*}", ";semi=%3B;dot=.;comma=%2C"],
  ["{?who}", "?who=fred"],
  ["{?half}", "?half=50%25"],
  ["{?x,y}", "?x=1024&y=768"],
  ["{?x,y,empty}", "?x=1024&y=768&empty="],
  ["{?x,y,undef}", "?x=1024&y=768"],
  ["{?var:3}", "?var=val"],
  ["{?list}", "?list=red,green,blue"],
  ["{?list*}", "?list=red&list=green&list=blue"],
  ["{?keys}", "?keys=semi,%3B,dot,.,comma,%2C"],
  ["{?keys*}", "?semi=%3B&dot=.&comma=%2C"],
  ["{&who}", "&who=fred"],
  ["{&half}", "&half=50%25"],
  ["?fixed=yes{&x}", "?fixed=yes&x=1024"],
  ["{&x,y,empty}", "&x=1024&y=768&empty="],
  ["{&x,y,undef}", "&x=1024&y=768"],
  ["{&var:3}", "&var=val"],
  ["{&list}", "&list=red,green,blue"],
  ["{&list*}", "&list=red&list=green&list=blue"],
  ["{&keys}", "&keys=semi,%3B,dot,.,comma,%2C"],
  ["{&keys*}", "&semi=%3B&dot=.&comma=%2C"],
];

describe("RFC 6570 section 3.2 examples", () => {
  const vars = { ...V, empty_keys: [] } as Record<string, unknown>;
  for (const [tpl, want] of RFC) {
    it(tpl, () => {
      expect(expandTemplate(tpl, vars)).toBe(want);
    });
  }
});

describe("parsing", () => {
  it("reports malformed templates", () => {
    expect(() => parseTemplate("a{b")).toThrow(/Unclosed/);
    expect(() => parseTemplate("a}b")).toThrow(/Unmatched/);
    expect(() => parseTemplate("{}")).toThrow(/Empty/);
    expect(() => parseTemplate("{=a}")).toThrow(/reserved/);
    expect(() => parseTemplate("{a b}")).toThrow(/Invalid variable/);
    expect(() => parseTemplate("{a:0}")).toThrow(/1-9999/);
    expect(() => parseTemplate("{{a}}")).toThrow(/Nested/);
  });
  it("lists variables with operator and modifiers", () => {
    expect(templateVariables("/u{/id,tag*}{?q:3}")).toEqual([
      { name: "id", op: "/", max: null, explode: false },
      { name: "tag", op: "/", max: null, explode: true },
      { name: "q", op: "?", max: 3, explode: false },
    ]);
  });
  it("rejects a prefix modifier on a list", () => {
    expect(() => expandTemplate("{list:2}", { list: ["a"] })).toThrow(/prefix modifier/);
  });
  it("prefix counts code points, not UTF-16 units", () => {
    expect(expandTemplate("{v:1}", { v: "😀x" })).toBe("%F0%9F%98%80");
  });
  it("keeps existing pct-triplets with + and #, encodes them otherwise", () => {
    expect(expandTemplate("{+v}", { v: "a%20b" })).toBe("a%20b");
    expect(expandTemplate("{v}", { v: "a%20b" })).toBe("a%2520b");
  });
});

describe("tool wrapper", () => {
  it("expands from a JSON string and numbers/booleans", () => {
    const r = fn("/items/{id}{?active,page}", { variables: '{"id": 42, "active": true, "page": 2}' });
    expect(r.output).toBe("/items/42?active=true&page=2");
  });
  it("explain mode adds per-variable notes", () => {
    const r = fn("{?q,none}", { variables: '{"q":"x"}', explain: true });
    expect(r.output).toContain("?q=x");
    expect(r.output).toContain("none: undefined or empty collection, skipped");
  });
  it("variables action", () => {
    const r = fn("/a{/b*}", { action: "variables" });
    expect(r.output).toContain("path segment (/), explode *");
  });
  it("check action reports each line", () => {
    const r = fn("{ok}\n{bad", { action: "check" });
    expect(r.output).toContain("OK   {ok}");
    expect(r.output).toContain("ERROR line 2");
  });
  it("bad JSON is an error", () => {
    expect(fn("{a}", { variables: "{nope" }).error?.message).toMatch(/JSON/);
    expect(fn("{a}", { variables: "[1]" }).error?.message).toMatch(/object/);
  });
});

const py = spawnSync("python3", ["-c", "import uritemplate"], { encoding: "utf8" });
describe.skipIf(py.status !== 0)("matches the python uritemplate library", () => {
  it("agrees on a mix of expressions with sorted keys", () => {
    const vars = { a: "x y/z", n: 7, l: ["p q", "r"], m: { b: "1", c: "é" }, e: "" };
    const tpls = ["{a}", "{+a}", "{#a}", "{.a}", "{/a}", "{;a}", "{?a}", "{&a}", "{l*}", "{/l*}", "{?l}", "{;l*}", "{m*}", "{?m*}", "{;m}", "{+m*}", "{a:2}", "{?a:2,n}", "{e}", "{;e}", "{?e}", "{n,e,a}", "q{?n,l*}"];
    const script = `import json,sys,uritemplate\nd=json.load(sys.stdin)\nprint(json.dumps([uritemplate.expand(t,d['v']) for t in d['t']]))`;
    const r = spawnSync("python3", ["-c", script], { input: JSON.stringify({ v: vars, t: tpls }), encoding: "utf8" });
    const want = JSON.parse(r.stdout) as string[];
    tpls.forEach((t, i) => expect(expandTemplate(t, vars), t).toBe(want[i]));
  });
});
