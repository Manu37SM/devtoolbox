import { describe, expect, it } from "vitest";
import { slugify } from "./transform";
import type { SlugifyOptions } from "./schema";

const base: SlugifyOptions = {
  separator: "-",
  lowercase: true,
  transliterate: true,
};

describe("slugify", () => {
  it("returns empty output for empty input", () => {
    const result = slugify("", base);
    expect(result).toEqual({ output: "", error: null });
  });

  it("converts a basic title to a slug", () => {
    const result = slugify("Hello World", base);
    expect(result.output).toBe("hello-world");
  });

  it("collapses consecutive separators and non-alphanumeric characters", () => {
    const result = slugify("Hello   World!!  Foo", base);
    expect(result.output).toBe("hello-world-foo");
  });

  it("trims leading and trailing separators", () => {
    const result = slugify("  --Hello World--  ", base);
    expect(result.output).toBe("hello-world");
  });

  it("uses underscore separator when requested", () => {
    const result = slugify("Hello World", { ...base, separator: "_" });
    expect(result.output).toBe("hello_world");
  });

  it("preserves case when lowercase is false", () => {
    const result = slugify("Hello World", { ...base, lowercase: false });
    expect(result.output).toBe("Hello-World");
  });

  it("transliterates accented characters when enabled", () => {
    const result = slugify("Café déjà vu", base);
    expect(result.output).toBe("cafe-deja-vu");
  });

  it("keeps accented characters as-is when transliterate is disabled", () => {
    const result = slugify("café", { ...base, transliterate: false });
    expect(result.output).not.toBe("cafe");
  });

  it("truncates to maxLength without a trailing separator", () => {
    const result = slugify("Hello Wonderful World", { ...base, maxLength: 8 });
    expect(result.output.length).toBeLessThanOrEqual(8);
    expect(result.output.endsWith("-")).toBe(false);
  });

  it("slugifies each line independently for multi-line input", () => {
    const result = slugify("Hello World\nFoo Bar Baz", base);
    expect(result.output).toBe("hello-world\nfoo-bar-baz");
  });

  it("handles numbers correctly", () => {
    const result = slugify("Top 10 Tips in 2026", base);
    expect(result.output).toBe("top-10-tips-in-2026");
  });
});
