import { describe, expect, it } from "vitest";
import { toolRegistry } from "./registry";
import { PIPELINE_COMPATIBLE_TOOLS, pipelineCompatibleSlugs } from "./pipeline-adapters";

describe("pipelineCompatibleSlugs", () => {
  it("every compatible slug exists in the tool registry", () => {
    const registrySlugs = new Set(toolRegistry.map((t) => t.slug));
    for (const slug of pipelineCompatibleSlugs) {
      expect(registrySlugs.has(slug)).toBe(true);
    }
  });

  it("is non-empty and matches the adapter registry's keys", () => {
    expect(pipelineCompatibleSlugs.length).toBeGreaterThan(0);
    expect(new Set(pipelineCompatibleSlugs)).toEqual(new Set(Object.keys(PIPELINE_COMPATIBLE_TOOLS)));
  });
});

describe("PIPELINE_COMPATIBLE_TOOLS adapters", () => {
  it("json-formatter beautifies minified JSON", async () => {

    const adapter = PIPELINE_COMPATIBLE_TOOLS["json-formatter"]!;
    const result = await adapter.run('{"a":1}', adapter.getDefaultOptions());
    expect(result.error).toBeNull();
    expect(result.output).toBe('{\n  "a": 1\n}');
  });

  it("base64 encodes plain text", async () => {
    const adapter = PIPELINE_COMPATIBLE_TOOLS.base64!;
    const result = await adapter.run("hello", { mode: "encode", urlSafe: false });
    expect(result).toEqual({ output: "aGVsbG8=", error: null });
  });

  it("base64 decodes to feed json-formatter", async () => {
    const base64Adapter = PIPELINE_COMPATIBLE_TOOLS.base64!;
    const jsonAdapter = PIPELINE_COMPATIBLE_TOOLS["json-formatter"]!;
    const decoded = await base64Adapter.run("eyJhIjoxfQ==", { mode: "decode", urlSafe: false });
    expect(decoded.error).toBeNull();
    const formatted = await jsonAdapter.run(decoded.output, jsonAdapter.getDefaultOptions());
    expect(formatted.output).toBe('{\n  "a": 1\n}');
  });

  it("hash-generator produces a single sha-256 hex digest", async () => {
    const adapter = PIPELINE_COMPATIBLE_TOOLS["hash-generator"]!;
    const result = await adapter.run("hello", { algorithm: "SHA-256", uppercase: false });
    expect(result.error).toBeNull();
    expect(result.output).toMatch(/^[0-9a-f]{64}$/);
  });

  it("slugify converts text to a URL-safe slug", async () => {
    const adapter = PIPELINE_COMPATIBLE_TOOLS.slugify!;
    const result = await adapter.run("Hello World!", adapter.getDefaultOptions());
    expect(result.error).toBeNull();
    expect(result.output).toBe("hello-world");
  });
});
