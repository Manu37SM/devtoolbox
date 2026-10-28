import { describe, expect, it } from "vitest";
import { formatGraphql, tokenize } from "./transform";

const f = (s: string, mode: "format" | "minify" = "format", indent: "2" | "4" | "tab" = "2") => formatGraphql(s, { mode, indent });

describe("tokenize", () => {
  it("handles strings, block strings, comments and spreads", () => {
    const t = tokenize('query Q { a(x: "hi \\" there") ...F # c\n b """block\nstring""" }');
    expect(t.map((x) => x.text)).toContain('"hi \\" there"');
    expect(t.find((x) => x.kind === "comment")!.text).toBe("# c");
    expect(t.find((x) => x.text.startsWith('"""'))!.text).toBe('"""block\nstring"""');
    expect(() => tokenize("{ a ? }")).toThrow(/Unexpected character/);
    expect(() => tokenize('{ a(x: "oops) }')).toThrow(/Unterminated/);
  });
});

describe("formatGraphql", () => {
  it("formats a query with args, aliases, variables and directives", () => {
    const r = f('query Q($id: ID!, $n: Int = 10) { user(id: $id) { name, friends(first: $n) @include(if: true) { name } } }');
    expect(r.error).toBeNull();
    expect(r.output).toBe(
      ["query Q($id: ID!, $n: Int = 10) {", "  user(id: $id) {", "    name", "    friends(first: $n) @include(if: true) {", "      name", "    }", "  }", "}", ""].join("\n"),
    );
  });
  it("formats fragments, spreads and inline fragments", () => {
    const r = f("{ a ...F ... on User { id } } fragment F on User { name }");
    expect(r.output).toBe(["{", "  a", "  ...F", "  ... on User {", "    id", "  }", "}", "", "fragment F on User {", "  name", "}", ""].join("\n"));
  });
  it("formats SDL types, enums and unions", () => {
    const r = f("type A implements B & C { id: ID! tags(limit: Int = 5): [String!]! @deprecated } enum E { X Y } union U = A | B");
    expect(r.output).toBe(
      ["type A implements B & C {", "  id: ID!", "  tags(limit: Int = 5): [String!]! @deprecated", "}", "", "enum E {", "  X", "  Y", "}", "", "union U = A | B", ""].join("\n"),
    );
  });
  it("keeps object and list literals inline", () => {
    const r = f('mutation { add(input: {name: "x", tags: ["a", "b"], n: 1}) { id } }');
    expect(r.output).toContain('add(input: { name: "x", tags: ["a", "b"], n: 1 }) {');
  });
  it("keeps comments and descriptions on their own lines", () => {
    const r = f('# top\ntype T {\n  "the id"\n  id: ID # trailing\n  name: String\n}');
    expect(r.output).toBe(['# top', 'type T {', '  "the id"', '  id: ID # trailing', '  name: String', '}', ''].join("\n"));
  });
  it("supports indent options and minify", () => {
    expect(f("{ a { b } }", "format", "4").output).toBe("{\n    a {\n        b\n    }\n}\n");
    expect(f("{ a { b } }", "format", "tab").output).toBe("{\n\ta {\n\t\tb\n\t}\n}\n");
    expect(f("query Q($a: Int!) { user(id: $a, x: 1) { name ...F } } # c", "minify").output).toBe("query Q($a:Int!){user(id:$a x:1){name...F}}");
  });
  it("reports unbalanced brackets and bad characters", () => {
    expect(f("{ a").error?.message).toContain("Unbalanced");
    expect(f("a }").error?.message).toContain("Unmatched");
    expect(f("{ ? }").error?.line).toBe(1);
  });
});
