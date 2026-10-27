import { describe, expect, it } from "vitest";
import { convertJsonToJava, mergeTypes, inferType, singular, toFieldName, toPascal } from "./transform";

const base = { style: "lombok", rootName: "Root", packageName: "", jackson: true } as const;
const gen = (json: unknown, o = {}) => convertJsonToJava(JSON.stringify(json), { ...base, ...o } as never);

describe("naming helpers", () => {
  it("converts keys to Pascal/camel names and avoids keywords and digits", () => {
    expect(toPascal("user_id")).toBe("UserId");
    expect(toPascal("first-name")).toBe("FirstName");
    expect(toFieldName("userID")).toBe("userID");
    expect(toFieldName("class")).toBe("class_");
    expect(toFieldName("2fa")).toBe("n2fa");
  });
  it("singularizes list names", () => {
    expect(singular("Addresses")).toBe("Address");
    expect(singular("Categories")).toBe("Category");
    expect(singular("Items")).toBe("Item");
    expect(singular("Status")).toBe("Status");
    expect(singular("Class")).toBe("Class");
  });
});

describe("type inference", () => {
  it("distinguishes int, long and double and widens on merge", () => {
    expect(inferType(5)).toEqual({ k: "int" });
    expect(inferType(3_000_000_000)).toEqual({ k: "long" });
    expect(inferType(1.5)).toEqual({ k: "double" });
    expect(mergeTypes({ k: "int" }, { k: "long" })).toEqual({ k: "long" });
    expect(mergeTypes({ k: "long" }, { k: "double" })).toEqual({ k: "double" });
    expect(mergeTypes({ k: "string" }, { k: "int" })).toEqual({ k: "unknown" });
    expect(mergeTypes({ k: "null" }, { k: "string" })).toEqual({ k: "string" });
  });
});

describe("generation", () => {
  const sample = { id: 1, user_name: "a", tags: ["x"], address: { zip: "1", geo: { lat: 1.5 } }, orders: [{ total: 2 }, { total: 3, note: "n" }], nothing: null };

  it("emits Lombok classes with nested types, lists and @JsonProperty", () => {
    const out = gen(sample).output;
    expect(out).toContain("import com.fasterxml.jackson.annotation.JsonProperty;");
    expect(out).toContain("import java.util.List;");
    expect(out).toContain("import lombok.Data;");
    expect(out).toContain("@Data\npublic class Root {");
    expect(out).toContain('@JsonProperty("user_name")\n    private String userName;');
    expect(out).toContain("private List<String> tags;");
    expect(out).toContain("private Address address;");
    expect(out).toContain("private List<Order> orders;");
    expect(out).toContain("private Object nothing;");
    expect(out).toContain("public class Geo {");
  });

  it("merges array element shapes into one class", () => {
    const out = gen(sample).output;
    const order = out.slice(out.indexOf("public class Order {"));
    expect(order).toContain("private Integer total;");
    expect(order).toContain("private String note;");
  });

  it("supports records and plain POJOs", () => {
    expect(gen({ a_b: 1 }, { style: "record" }).output).toContain('public record Root(@JsonProperty("a_b") Integer aB) {}');
    const pojo = gen({ name: "x" }, { style: "pojo" }).output;
    expect(pojo).toContain("public String getName() {");
    expect(pojo).toContain("public void setName(String name) {");
    expect(pojo).not.toContain("lombok");
  });

  it("omits Jackson annotations when disabled and adds the package line", () => {
    const out = gen({ a_b: 1 }, { jackson: false, packageName: "com.acme.dto" }).output;
    expect(out.startsWith("package com.acme.dto;\n")).toBe(true);
    expect(out).not.toContain("JsonProperty");
  });

  it("handles a root array and uniquifies clashing class names", () => {
    expect(gen([{ a: 1 }]).output).toContain("The JSON root is an array of Root");
    const out = gen({ item: { a: 1 }, other: { item: { b: 1 } } }).output;
    expect(out).toContain("class Item {");
    expect(out).toContain("class Item2 {");
  });

  it("rejects non-object roots and invalid JSON", () => {
    expect(gen(5).error?.message).toMatch(/object/);
    expect(convertJsonToJava("{", base).error?.message).toMatch(/Invalid JSON/);
    expect(convertJsonToJava("", base)).toEqual({ output: "", error: null });
  });
});
