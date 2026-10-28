import { describe, expect, it } from "vitest";
import { extractHeadings, generateToc, githubSlug, plainTitle } from "./transform";

const doc = `# Title
Intro
## Getting Started
### Install \`npm\` & run
\`\`\`bash
# not a heading
\`\`\`
## Getting Started
#### Deep
## Q&A: *Why?* [docs](http://x.y) ##
`;
const o = { minLevel: 1, maxLevel: 3, bullet: "dash", links: true } as const;

describe("helpers", () => {
  it("strips inline markdown", () => {
    expect(plainTitle("Q&A: *Why?* [docs](http://x.y) ##")).toBe("Q&A: Why? docs");
    expect(plainTitle("`code` and **bold**")).toBe("code and bold");
  });
  it("builds GitHub slugs", () => {
    expect(githubSlug("Install npm & run")).toBe("install-npm--run");
    expect(githubSlug("Q&A: Why?")).toBe("qa-why");
    expect(githubSlug("Ünï Çödé 2")).toBe("ünï-çödé-2");
  });
  it("ignores headings inside code fences", () => {
    expect(extractHeadings(doc).map((h) => h.text)).not.toContain("not a heading");
    expect(extractHeadings(doc)).toHaveLength(6);
  });
});

describe("generateToc", () => {
  it("nests by level, dedupes anchors, respects max level", () => {
    const r = generateToc(doc, o);
    expect(r.output).toBe(
      [
        "- [Title](#title)",
        "  - [Getting Started](#getting-started)",
        "    - [Install npm & run](#install-npm--run)",
        "  - [Getting Started](#getting-started-1)",
        "  - [Q&A: Why? docs](#qa-why-docs)",
      ].join("\n"),
    );
  });
  it("supports numbered lists, no links and min level", () => {
    const r = generateToc(doc, { ...o, bullet: "numbered", links: false, minLevel: 2 });
    expect(r.output).toBe(["1. Getting Started", "   1. Install npm & run", "2. Getting Started", "3. Q&A: Why? docs"].join("\n"));
  });
  it("errors sensibly", () => {
    expect(generateToc("no headings", o).error).not.toBeNull();
    expect(generateToc("# a", { ...o, minLevel: 4, maxLevel: 2 }).error?.message).toContain("Min level");
  });
});
