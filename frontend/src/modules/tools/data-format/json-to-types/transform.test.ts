import { describe, expect, it } from "vitest";
import { generateTypes } from "./transform";
import type { JsonToTypesOptions } from "./schema";

const ts: JsonToTypesOptions = { language: "typescript", rootName: "Root", tsDeclaration: "interface", exportTypes: false, readonlyFields: false, goPackage: "main", goOmitEmpty: false, pythonStyle: "dataclass" };
const go: JsonToTypesOptions = { language: "go", rootName: "Root", tsDeclaration: "interface", exportTypes: false, readonlyFields: false, goPackage: "main", goOmitEmpty: false, pythonStyle: "dataclass" };
const py: JsonToTypesOptions = { language: "python", rootName: "Root", tsDeclaration: "interface", exportTypes: false, readonlyFields: false, goPackage: "main", goOmitEmpty: false, pythonStyle: "dataclass" };

describe("generateTypes", () => {
  it("generates a TypeScript interface for a flat object", () => {
    const result = generateTypes('{"id":1,"name":"a","active":true}', ts);
    expect(result.error).toBeNull();
    expect(result.output).toContain("interface Root {");
    expect(result.output).toContain("id: number;");
    expect(result.output).toContain("name: string;");
    expect(result.output).toContain("active: boolean;");
  });

  it("generates nested TypeScript interfaces", () => {
    const result = generateTypes('{"user":{"id":1}}', ts);
    expect(result.output).toContain("interface User {");
    expect(result.output).toContain("interface Root {");
    expect(result.output).toContain("user: User;");
  });

  it("generates array types in TypeScript", () => {
    const result = generateTypes('{"items":[{"id":1}]}', ts);
    expect(result.output).toContain("items: Item[];");
    expect(result.output).toContain("interface Item {");
  });

  it("generates a Go struct with json tags", () => {
    const result = generateTypes('{"id":1,"name":"a"}', go);
    expect(result.output).toContain("package main");
    expect(result.output).toContain("type Root struct {");
    expect(result.output).toContain('Id int `json:"id"`');
    expect(result.output).toContain('Name string `json:"name"`');
  });

  it("generates nested Go structs", () => {
    const result = generateTypes('{"user":{"id":1}}', go);
    expect(result.output).toContain("type User struct {");
    expect(result.output).toContain('User User `json:"user"`');
  });

  it("generates a Python dataclass", () => {
    const result = generateTypes('{"id":1,"name":"a"}', py);
    expect(result.output).toContain("from dataclasses import dataclass");
    expect(result.output).toContain("@dataclass");
    expect(result.output).toContain("class Root:");
    expect(result.output).toContain("id: int");
    expect(result.output).toContain("name: str");
  });

  it("generates a Python dataclass with typing imports for arrays", () => {
    const result = generateTypes('{"tags":["a","b"]}', py);
    expect(result.output).toContain("from typing import List");
    expect(result.output).toContain("tags: List[str]");
  });

  it("respects a custom root name", () => {
    const result = generateTypes('{"id":1}', { ...ts, rootName: "Widget" });
    expect(result.output).toContain("interface Widget {");
  });

  it("returns empty output for empty input without error", () => {
    const result = generateTypes("   ", ts);
    expect(result).toEqual({ output: "", error: null });
  });

  it("returns a structured error for malformed JSON", () => {
    const result = generateTypes("{not valid", ts);
    expect(result.output).toBe("");
    expect(result.error).not.toBeNull();
  });

  it("handles a root-level array of primitives as a type alias in TypeScript", () => {
    const result = generateTypes("[1,2,3]", ts);
    expect(result.output).toBe("type Root = number[];");
  });

  it("quotes non-identifier keys in TypeScript", () => {
    const result = generateTypes('{"first-name":"a"}', ts);
    expect(result.output).toContain('"first-name": string;');
  });

  const users = '{"users":[{"id":1,"name":"Asha","score":1},{"id":2,"name":null,"score":2.5,"email":"b@x.in"}]}';

  it("merges array elements into one type with optional and nullable fields", () => {
    const out = generateTypes(users, ts).output;
    expect(out).toContain("interface User {\n  id: number;\n  name: string | null;\n  score: number;\n  email?: string;\n}");
    expect(out).not.toContain("User2");
  });

  it("supports type aliases, export and readonly in TypeScript", () => {
    expect(generateTypes('{"id":1}', { ...ts, tsDeclaration: "type", exportTypes: true, readonlyFields: true }).output).toBe(
      "export type Root = {\n  readonly id: number;\n};",
    );
  });

  it("uses pointers and omitempty for optional Go fields and honours the package name", () => {
    const out = generateTypes(users, { ...go, goPackage: "model" }).output;
    expect(out).toContain("package model");
    expect(out).toContain('Name *string `json:"name"`');
    expect(out).toContain('Email *string `json:"email,omitempty"`');
    expect(generateTypes('{"id":1}', { ...go, goOmitEmpty: true }).output).toContain('Id int `json:"id,omitempty"`');
  });

  it("renders TypedDict and Pydantic models with optional fields last where required", () => {
    const td = generateTypes(users, { ...py, pythonStyle: "typeddict" }).output;
    expect(td).toContain("from typing import List, NotRequired, Optional, TypedDict");
    expect(td).toContain("class User(TypedDict):\n    id: int\n    name: Optional[str]\n    score: float\n    email: NotRequired[str]");
    const pd = generateTypes(users, { ...py, pythonStyle: "pydantic" }).output;
    expect(pd).toContain("from pydantic import BaseModel");
    expect(pd).toContain("class User(BaseModel):\n    id: int\n    name: Optional[str]\n    score: float\n    email: Optional[str] = None");
  });
});

