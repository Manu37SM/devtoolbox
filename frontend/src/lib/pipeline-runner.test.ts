import { describe, expect, it } from "vitest";
import { runPipeline } from "./pipeline-runner";
import type { PipelineStepRecord } from "./db";

describe("runPipeline", () => {
  it("returns the initial input unchanged when there are no steps", async () => {
    const result = await runPipeline([], "hello world");
    expect(result).toEqual({ steps: [], finalOutput: "hello world" });
  });

  it("chains base64-decode -> json-formatter (happy path, 2 steps)", async () => {
    // '{"a":1,"b":"two"}' base64-encoded.
    const base64Input = Buffer.from('{"a":1,"b":"two"}', "utf-8").toString("base64");
    const steps: PipelineStepRecord[] = [
      { toolSlug: "base64", optionsJson: { mode: "decode", urlSafe: false } },
      { toolSlug: "json-formatter", optionsJson: {} },
    ];

    const result = await runPipeline(steps, base64Input);

    expect(result.steps).toHaveLength(2);
    // `toHaveLength(2)` above already guarantees these indices exist —
    // `noUncheckedIndexedAccess` just can't infer that from the assertion.
    expect(result.steps[0]!.error).toBeNull();
    expect(result.steps[0]!.output).toBe('{"a":1,"b":"two"}');
    expect(result.steps[1]!.error).toBeNull();
    expect(result.finalOutput).toBe('{\n  "a": 1,\n  "b": "two"\n}');
  });

  it("stops the chain at the first erroring step and reports partial results", async () => {
    const steps: PipelineStepRecord[] = [
      { toolSlug: "base64", optionsJson: { mode: "decode", urlSafe: false } },
      { toolSlug: "json-formatter", optionsJson: {} },
    ];

    // Not valid base64 -> step 1 errors, step 2 (json-formatter) never runs.
    const result = await runPipeline(steps, "not@@valid!!base64");

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]!.toolSlug).toBe("base64");
    expect(result.steps[0]!.error).not.toBeNull();
    expect(result.finalOutput).toBe("");
  });

  it("reports an error and stops for an unknown/non-pipeline-compatible tool slug", async () => {
    const steps: PipelineStepRecord[] = [{ toolSlug: "not-a-real-tool", optionsJson: {} }];
    const result = await runPipeline(steps, "input");

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]!.error?.message).toContain("not-a-real-tool");
  });

  it("falls back to a step's default options when optionsJson is empty", async () => {
    const steps: PipelineStepRecord[] = [{ toolSlug: "slugify", optionsJson: {} }];
    const result = await runPipeline(steps, "Hello World");
    expect(result.steps[0]!.error).toBeNull();
    expect(result.finalOutput).toBe("hello-world");
  });
});
