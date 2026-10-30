import { describe, expect, it } from "vitest";
import { buildAsciiTree } from "./transform";

const PATHS = "src/index.ts\nsrc/lib/util.ts\nREADME.md\npackage.json";

describe("buildAsciiTree", () => {
  it("draws a unicode tree from paths with a . root", () => {
    expect(buildAsciiTree(PATHS, {}).output).toBe(
      [".", "├── src/", "│   ├── index.ts", "│   └── lib/", "│       └── util.ts", "├── README.md", "└── package.json"].join("\n"),
    );
  });
  it("supports ascii connectors, folders-first sorting and a custom root", () => {
    const r = buildAsciiTree(PATHS, { charset: "ascii", sort: "folders-first", rootName: "app" });
    expect(r.output.split("\n")).toEqual(["app", "|-- src/", "|   |-- lib/", "|   |   `-- util.ts", "|   `-- index.ts", "|-- package.json", "`-- README.md"]);
  });
  it("uses a single top-level folder as the root and can drop slashes", () => {
    const r = buildAsciiTree("proj/a.txt\nproj/sub/b.txt", { trailingSlash: false });
    expect(r.output).toBe(["proj", "├── a.txt", "└── sub", "    └── b.txt"].join("\n"));
  });
  it("parses indented outlines, bullets and tabs", () => {
    const outline = "- src\n  - main\n    - App.java\n  - test\n- pom.xml";
    expect(buildAsciiTree(outline, { output: "paths" }).output).toBe("src/main/App.java\nsrc/test\npom.xml");
    expect(buildAsciiTree("src\n  test/", { output: "paths" }).output).toBe("src/test/");
    expect(buildAsciiTree("a\n\tb\n\t\tc.txt", { output: "paths" }).output).toBe("a/b/c.txt");
  });
  it("round-trips the tree command's own output", () => {
    const tree = buildAsciiTree(PATHS, { sort: "alpha" }).output;
    const back = buildAsciiTree(tree, { output: "paths", sort: "alpha" }).output;
    expect(back.split("\n").sort()).toEqual(["README.md", "package.json", "src/index.ts", "src/lib/util.ts"].sort());
    expect(buildAsciiTree(tree + "\n\n2 directories, 3 files", { output: "paths" }).error).toBeNull();
  });
  it("limits depth, counts, and emits markdown and json", () => {
    const shallow = buildAsciiTree(PATHS, { maxDepth: 1, summary: true });
    expect(shallow.output).toContain("└── package.json");
    expect(shallow.output).not.toContain("index.ts");
    expect(shallow.output).toMatch(/1 directory, 2 files$/);
    expect(buildAsciiTree("a/b.txt", { output: "markdown" }).output).toBe("- a/\n  - b.txt");
    expect(JSON.parse(buildAsciiTree("a/b.txt\nc", { output: "json" }).output)).toEqual({ a: { "b.txt": null }, c: null });
  });
  it("handles empty input", () => {
    expect(buildAsciiTree("  \n", {})).toEqual({ output: "", error: null });
  });
});
