import { describe, expect, it } from "vitest";
import { expandYaml } from "./transform";

const y = (s: string, o = {}) => expandYaml(s, { output: "yaml", sortKeys: false, ...o });
const CI = `defaults: &defaults
  image: node:20
  retries: 2
test:
  <<: *defaults
  script: npm test
lint:
  <<: *defaults
  retries: 0
  script: npm run lint
`;

describe("expandYaml", () => {
  it("expands merge keys, with local overrides winning", () => {
    expect(y(CI).output).toBe(`defaults:
  image: node:20
  retries: 2
test:
  image: node:20
  retries: 2
  script: npm test
lint:
  image: node:20
  retries: 0
  script: npm run lint
`);
  });
  it("expands plain aliases without writing anchors back", () => {
    const o = y("a: &x [1, 2]\nb: *x\n").output;
    expect(o).toBe("a:\n  - 1\n  - 2\nb:\n  - 1\n  - 2\n");
    expect(o).not.toMatch(/[&*]/);
  });
  it("json output and key sorting", () => {
    expect(y("b: 1\na: &z 2\nc: *z\n", { output: "json", sortKeys: true }).output).toBe('{\n  "a": 2,\n  "b": 1,\n  "c": 2\n}');
  });
  it("multi-document input", () => {
    expect(y("a: 1\n---\nb: 2\n").output).toBe("a: 1\n---\nb: 2\n");
    expect(JSON.parse(y("a: 1\n---\nb: 2\n", { output: "json" }).output)).toEqual([{ a: 1 }, { b: 2 }]);
  });
  it("reports syntax errors with a position and unknown aliases", () => {
    const e = y("a: [1, 2\nb: 3").error;
    expect(e?.line).toBeGreaterThan(0);
    expect(y("a: *missing").error?.message).toMatch(/alias|anchor/i);
    expect(y("")).toEqual({ output: "", error: null });
  });
});
