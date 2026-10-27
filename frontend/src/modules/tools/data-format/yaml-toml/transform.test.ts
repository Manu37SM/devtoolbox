import { describe, expect, it } from "vitest";
import { load } from "js-yaml";
import { parse } from "smol-toml";
import { convertYamlToml } from "./transform";

const y2t = { mode: "yaml-to-toml", indent: "2" } as const;
const t2y = { mode: "toml-to-yaml", indent: "2" } as const;

describe("convertYamlToml", () => {
  it("converts YAML to TOML", () => {
    const toml = convertYamlToml("title: x\nowner:\n  name: Ann\nports: [1, 2]\n", y2t).output;
    expect(parse(toml)).toEqual({ title: "x", owner: { name: "Ann" }, ports: [1, 2] });
  });

  it("converts TOML to YAML honouring indent", () => {
    const yaml = convertYamlToml('[a]\nb = 1\n[a.c]\nd = "x"\n', { ...t2y, indent: "4" }).output;
    expect(load(yaml)).toEqual({ a: { b: 1, c: { d: "x" } } });
    expect(yaml).toContain("\n    b: 1");
  });

  it("handles arrays of tables", () => {
    const toml = convertYamlToml("items:\n  - n: 1\n  - n: 2\n", y2t).output;
    expect(toml).toContain("[[items]]");
  });

  it("explains where a null blocks the conversion", () => {
    const r = convertYamlToml("a:\n  b: ~\n", y2t);
    expect(r.error?.message).toContain('"a.b"');
  });

  it("requires a mapping at the root", () => {
    expect(convertYamlToml("- 1\n- 2", y2t).error).not.toBeNull();
  });

  it("reports parse errors in both directions", () => {
    expect(convertYamlToml("a: [", y2t).error).not.toBeNull();
    expect(convertYamlToml("a = ", t2y).error).not.toBeNull();
  });

  it("handles empty input", () => {
    expect(convertYamlToml(" ", y2t)).toEqual({ output: "", error: null });
  });
});
