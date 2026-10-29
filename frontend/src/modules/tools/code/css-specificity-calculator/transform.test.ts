import { describe, expect, it } from "vitest";
import { runCssSpecificityCalculator, specificity, splitList } from "./transform";

describe("specificity (Selectors Level 4 examples)", () => {
  const cases: [string, [number, number, number]][] = [
    ["*", [0, 0, 0]],
    ["li", [0, 0, 1]],
    ["ul li", [0, 0, 2]],
    ["ul ol+li", [0, 0, 3]],
    ["h1 + *[rel=up]", [0, 1, 1]],
    ["ul ol li.red", [0, 1, 3]],
    ["li.red.level", [0, 2, 1]],
    ["#x34y", [1, 0, 0]],
    ["#s12:not(FOO)", [1, 0, 1]],
    [".foo :is(.bar, #baz)", [1, 1, 0]],
    [":where(#a, .b) p", [0, 0, 1]],
    ["a:hover::before", [0, 1, 2]],
    ["p:first-line", [0, 0, 2]],
    [":nth-child(2n+1 of .item, #main)", [1, 1, 0]],
    ["div:has(> img.hero)", [0, 1, 2]],
    ['input[type="text" i]:focus-visible', [0, 2, 1]],
    ["svg|rect", [0, 0, 1]],
    ["::slotted(span.x)", [0, 1, 2]],
  ];
  for (const [sel, spec] of cases) it(sel, () => expect(specificity(sel)).toEqual(spec));
  it("rejects malformed selectors", () => {
    expect(() => specificity("a[href")).toThrow("Unclosed attribute");
    expect(() => specificity(":is(.a")).toThrow("Unbalanced");
  });
});

describe("runCssSpecificityCalculator", () => {
  it("splits lists, sorts and marks the winner", () => {
    expect(splitList('a, b:is(.x, .y), [title="a,b"]')).toEqual(["a", "b:is(.x, .y)", '[title="a,b"]']);
    const out = runCssSpecificityCalculator(".btn.primary { color: red }\n#nav a\nbutton", { sort: "specificity" }).output.split("\n");
    expect(out[1]).toMatch(/^1,0,1\s+#nav a\s+<- wins$/);
    expect(out[2]).toMatch(/^0,2,0\s+\.btn\.primary$/);
    expect(out[3]).toMatch(/^0,0,1\s+button$/);
  });
  it("breaks ties by source order", () => {
    const out = runCssSpecificityCalculator(".a\n.b", { sort: "input" }).output;
    expect(out).toMatch(/0,1,0\s+\.b\s+<- wins/);
  });
});
