import { describe, expect, it } from "vitest";
import { infer, jsonToGoPython, merge, pascal } from "./transform";

const go = { target: "go" as const, omitEmpty: true, pointerForNullable: true };
const sample = '{"id":1,"user_name":"ann","score":9.5,"tags":["a","b"],"address":{"city":"X","zip":null},"items":[{"sku":"a","qty":1},{"sku":"b","note":"n"}]}';

describe("helpers", () => {
  it("pascal-cases with initialisms", () => {
    expect(pascal("user_id")).toBe("UserID");
    expect(pascal("apiURL")).toBe("APIURL");
    expect(pascal("2fa")).toBe("N2fa");
  });
  it("merges int/float and marks missing fields optional", () => {
    expect(merge({ k: "int" }, { k: "float" })).toEqual({ k: "float" });
    expect(merge({ k: "int" }, { k: "string" })).toEqual({ k: "any" });
    const m = merge(infer({ a: 1 }), infer({ b: 2 })) as { fields: Map<string, { optional: boolean }> };
    expect([...m.fields].map(([k, f]) => [k, f.optional])).toEqual([["a", true], ["b", true]]);
  });
});

describe("Go output", () => {
  it("emits nested structs with tags, pointers and omitempty", () => {
    const r = jsonToGoPython("name: Order\n" + sample, go).output;
    expect(r).toContain("package main");
    expect(r).toContain("type Order struct {");
    expect(r).toContain("ID       int64");
    expect(r).toContain('`json:"user_name"`');
    expect(r).toContain("Tags     []string");
    expect(r).toContain("Address  Address");
    expect(r).toContain("type Address struct {");
    expect(r).toContain('Zip  interface{} `json:"zip,omitempty"`');
    expect(r).toContain("type Item struct {");
    expect(r).toContain('Qty  *int64  `json:"qty,omitempty"`');
    expect(r).toContain('Note *string `json:"note,omitempty"`');
  });
  it("can drop omitempty and pointers", () => {
    const r = jsonToGoPython('{"a":[{"x":1},{"y":2}]}', { ...go, omitEmpty: false, pointerForNullable: false }).output;
    expect(r).not.toContain("omitempty");
    expect(r).not.toContain("*");
  });
  it("handles top-level arrays and scalars", () => {
    expect(jsonToGoPython("[1,2]", go).output).toContain("type Root []int64");
    expect(jsonToGoPython('[{"a":1}]', go).output).toContain("type Root struct");
  });
});

describe("Python output", () => {
  it("emits dataclasses with optional fields last", () => {
    const r = jsonToGoPython("name: Order\n" + sample, { ...go, target: "python-dataclass" }).output;
    expect(r).toContain("from dataclasses import dataclass");
    expect(r).toContain("@dataclass\nclass Item:\n    sku: str\n    qty: int | None = None\n    note: str | None = None");
    expect(r).toContain("class Order:");
    expect(r).toContain("    user_name: str");
    expect(r).toContain("tags: list[str]");
    expect(r.indexOf("class Item")).toBeLessThan(r.indexOf("class Order"));
  });
  it("emits pydantic models with aliases for renamed keys", () => {
    const r = jsonToGoPython('{"userName":"a","class":1}', { ...go, target: "python-pydantic" }).output;
    expect(r).toContain("from pydantic import BaseModel, Field");
    expect(r).toContain('user_name: str = Field(alias="userName")');
    expect(r).toContain('class_: int = Field(alias="class")');
  });
  it("emits TypedDicts and imports Any when needed", () => {
    const r = jsonToGoPython('{"a":[],"b":{"c":1}}', { ...go, target: "python-typeddict" }).output;
    expect(r).toContain("from typing import TypedDict");
    expect(r).toContain("from typing import Any");
    expect(r).toContain("class B(TypedDict):");
  });
  it("reports invalid JSON and empty input", () => {
    expect(jsonToGoPython("{", go).error?.message).toMatch(/Invalid JSON/);
    expect(jsonToGoPython("", go)).toEqual({ output: "", error: null });
  });
});
