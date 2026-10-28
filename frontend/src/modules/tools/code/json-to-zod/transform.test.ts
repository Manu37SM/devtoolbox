import { describe, expect, it } from "vitest";
import { jsonToZod } from "./transform";

const o = { style: "named" as const, detectFormats: true, strict: false, exportTypes: true };

describe("jsonToZod", () => {
  it("generates a flat object schema with formats and a type export", () => {
    const r = jsonToZod('name: user\n{"id":"3f2b8c1e-5d4a-4c3b-9a1e-0d7f6a5b4c3d","email":"a@b.co","age":30,"score":9.5,"active":true,"site":"https://x.io","created":"2024-01-02T03:04:05Z"}', o).output;
    expect(r).toBe(`import { z } from "zod";

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  age: z.number().int(),
  score: z.number(),
  active: z.boolean(),
  site: z.url(),
  created: z.iso.datetime(),
});

export type User = z.infer<typeof userSchema>;
`);
  });
  it("emits named sub-schemas before the root and marks optional/nullable fields", () => {
    const r = jsonToZod('{"items":[{"sku":"a","qty":1},{"sku":"b","note":null}],"address":{"city":"X"}}', o).output;
    expect(r.indexOf("const itemSchema")).toBeGreaterThan(-1);
    expect(r.indexOf("const itemSchema")).toBeLessThan(r.indexOf("export const rootSchema"));
    expect(r).toContain("qty: z.number().int().optional(),");
    expect(r).toContain("note: z.null().optional(),");
    expect(r).toContain("items: z.array(itemSchema),");
    expect(r).toContain("address: addressSchema,");
  });
  it("supports inline style, strict objects and disabling formats/types", () => {
    const r = jsonToZod('{"a":{"b":"x@y.co"}}', { style: "inline", detectFormats: false, strict: true, exportTypes: false }).output;
    expect(r).toContain("z.strictObject({\n  a: z.strictObject({\n    b: z.string(),\n  }),\n});");
    expect(r).not.toContain("export type");
    expect(r).not.toContain("z.email");
  });
  it("quotes awkward keys and handles scalar / array roots", () => {
    expect(jsonToZod('{"first-name":"a"}', o).output).toContain('"first-name": z.string(),');
    expect(jsonToZod("[1,2]", o).output).toContain("export const rootSchema = z.array(z.number().int());");
    expect(jsonToZod("[]", o).output).toContain("z.array(z.unknown())");
  });
  it("merges null with a value into nullable", () => {
    expect(jsonToZod('[{"a":1},{"a":null}]', o).output).toContain("a: z.number().int().nullable(),");
  });
  it("reports invalid JSON", () => {
    expect(jsonToZod("{", o).error?.message).toMatch(/Invalid JSON/);
    expect(jsonToZod("", o)).toEqual({ output: "", error: null });
  });
});
